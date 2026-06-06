import { OperationLog, OperationType, ResourceType, LogLevel, Alert, AlertType, AlertSeverity, AlertStatus } from '../models';
import logger from '../utils/logger';
import { config } from '../config';
import axios from 'axios';

export interface CreateLogParams {
  operationType: OperationType;
  resourceType: ResourceType;
  resourceId?: string;
  operatorId?: string;
  operatorName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  level?: LogLevel;
}

export interface CreateAlertParams {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  recipientIds?: string[];
  channels?: string[];
  metadata?: Record<string, unknown>;
}

class LogAlertService {
  async createLog(params: CreateLogParams): Promise<OperationLog> {
    const log = await OperationLog.create({
      operationType: params.operationType,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      level: params.level || LogLevel.INFO,
    });

    if (params.level === LogLevel.ERROR || params.level === LogLevel.CRITICAL) {
      logger.warn(`检测到${params.level}级别日志，准备触发预警`);
      await this.createAlert({
        type: AlertType.SYSTEM_ERROR,
        severity: params.level === LogLevel.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: `系统${params.level === LogLevel.CRITICAL ? '严重' : ''}错误`,
        message: String(params.details?.message || '未知错误'),
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: params.details,
      });
    }

    return log;
  }

  async createAlert(params: CreateAlertParams): Promise<Alert> {
    const alert = await Alert.create({
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      status: AlertStatus.PENDING,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      recipientIds: params.recipientIds,
      channels: params.channels || ['webhook', 'email'],
      metadata: params.metadata,
    });

    logger.info(`创建预警 - 类型: ${params.type}, 级别: ${params.severity}, 标题: ${params.title}`);

    setImmediate(() => {
      this.sendAlert(alert).catch((err) => logger.error('发送预警失败:', err));
    });

    return alert;
  }

  async sendAlert(alert: Alert): Promise<void> {
    try {
      if (config.webhook.url && alert.channels?.includes('webhook')) {
        await this.sendWebhookAlert(alert);
      }

      alert.status = AlertStatus.SENT;
      alert.sentAt = new Date();
      await alert.save();

      logger.info(`预警已发送 - ID: ${alert.id}`);
    } catch (error) {
      logger.error('发送预警失败:', error);
    }
  }

  async sendWebhookAlert(alert: Alert): Promise<void> {
    if (!config.webhook.url) return;

    const severityEmoji: Record<AlertSeverity, string> = {
      [AlertSeverity.LOW]: 'ℹ️',
      [AlertSeverity.MEDIUM]: '⚠️',
      [AlertSeverity.HIGH]: '🔴',
      [AlertSeverity.CRITICAL]: '🚨',
    };

    const message = {
      msgtype: 'markdown',
      markdown: {
        content: `${severityEmoji[alert.severity]} **${alert.title}**\n\n` +
          `**时间**: ${new Date().toLocaleString('zh-CN')}\n` +
          `**类型**: ${alert.type}\n` +
          `**详情**: ${alert.message}\n` +
          (alert.resourceId ? `**资源ID**: ${alert.resourceId}\n` : ''),
      },
    };

    try {
      await axios.post(config.webhook.url, message, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      logger.error('Webhook发送失败:', error);
      throw error;
    }
  }

  async getOperationLogs(
    filters: {
      resourceType?: ResourceType;
      resourceId?: string;
      operatorId?: string;
      operationType?: OperationType;
      level?: LogLevel;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    data: OperationLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: Record<string, unknown> = {};
    const { Op } = require('sequelize');

    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.operatorId) where.operatorId = filters.operatorId;
    if (filters.operationType) where.operationType = filters.operationType;
    if (filters.level) where.level = filters.level;

    if (filters.startDate && filters.endDate) {
      where.createdAt = { [Op.between]: [filters.startDate, filters.endDate] };
    }

    const { count, rows } = await OperationLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      data: rows,
      total: count,
      page,
      pageSize,
    };
  }

  async getPendingAlerts(): Promise<Alert[]> {
    return Alert.findAll({
      where: { status: AlertStatus.PENDING },
      order: [['severity', 'DESC'], ['createdAt', 'ASC']],
    });
  }

  async acknowledgeAlert(alertId: string, operatorId: string): Promise<Alert> {
    const alert = await Alert.findByPk(alertId);
    if (!alert) {
      throw new Error('预警不存在');
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = operatorId;
    alert.acknowledgedAt = new Date();
    await alert.save();

    logger.info(`预警已确认 - ID: ${alertId}, 操作人: ${operatorId}`);
    return alert;
  }

  async resolveAlert(alertId: string, operatorId: string, resolutionNote?: string): Promise<Alert> {
    const alert = await Alert.findByPk(alertId);
    if (!alert) {
      throw new Error('预警不存在');
    }

    alert.status = AlertStatus.RESOLVED;
    alert.acknowledgedBy = operatorId;
    alert.acknowledgedAt = new Date();
    if (resolutionNote) {
      alert.metadata = { ...alert.metadata, resolutionNote };
    }
    await alert.save();

    logger.info(`预警已解决 - ID: ${alertId}, 操作人: ${operatorId}`);
    return alert;
  }

  async sendBudgetOverrunAlert(departmentId: string, departmentName: string, overrunAmount: number, budget: number): Promise<Alert> {
    return this.createAlert({
      type: AlertType.BUDGET_OVERRUN,
      severity: overrunAmount / budget > 0.5 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
      title: '预算超支预警',
      message: `部门【${departmentName}】本月预算超支 ¥${overrunAmount.toLocaleString()}，超支比例: ${((overrunAmount / budget) * 100).toFixed(2)}%`,
      resourceType: 'budget',
      resourceId: departmentId,
    });
  }

  async sendAnomalyExpenseAlert(expenseId: string, employeeName: string, amount: number, reasons: string[]): Promise<Alert> {
    return this.createAlert({
      type: AlertType.ANOMALY_EXPENSE,
      severity: AlertSeverity.MEDIUM,
      title: '异常费用检测',
      message: `员工【${employeeName}】提交异常费用 ¥${amount.toLocaleString()}，异常原因: ${reasons.join('; ')}`,
      resourceType: 'expense',
      resourceId: expenseId,
    });
  }

  async sendApprovalTimeoutAlert(applicationId: string, applicationNo: string, hours: number): Promise<Alert> {
    return this.createAlert({
      type: AlertType.APPROVAL_TIMEOUT,
      severity: AlertSeverity.MEDIUM,
      title: '审批超时提醒',
      message: `差旅申请【${applicationNo}】已等待审批超过${hours}小时，请及时处理`,
      resourceType: 'travel_application',
      resourceId: applicationId,
    });
  }
}

export default new LogAlertService();
