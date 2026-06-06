import { Transaction, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  TravelApplication,
  TravelApplicationStatus,
  NecessityCheckResult,
  TravelType,
  Employee,
  Department,
  ApprovalRecord,
  EmployeeRole,
} from '../models';
import BudgetService from './BudgetService';
import logger from '../utils/logger';
import sequelize from '../database';

export interface CreateApplicationRequest {
  employeeId: string;
  travelType: TravelType;
  purpose: string;
  destination: string;
  departureCity: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

export interface NecessityCheck {
  result: NecessityCheckResult;
  details: Record<string, unknown>;
  alternatives: string[];
}

export interface CostEstimate {
  flight: number;
  accommodation: number;
  meals: number;
  transportation: number;
  other: number;
  total: number;
  breakdown: Record<string, unknown>;
}

class TravelApplicationService {
  generateApplicationNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRV${dateStr}${random}`;
  }

  async checkNecessity(purpose: string, destination: string, days: number): Promise<NecessityCheck> {
    const alternatives: string[] = [];
    const details: Record<string, unknown> = {};

    const purposeLower = purpose.toLowerCase();

    if (purposeLower.includes('会议') || purposeLower.includes('培训') || purposeLower.includes('meeting')) {
      alternatives.push('视频会议：腾讯会议/Zoom，节省差旅成本');
      details.hasVirtualAlternative = true;
    }

    if (days <= 1) {
      alternatives.push('高铁/动车往返，无需住宿');
      details.oneDayTrip = true;
    }

    if (days > 7) {
      details.longTrip = true;
      details.recommendedSplit = '建议分多次短途出差';
    }

    let result = NecessityCheckResult.PASSED;

    if (alternatives.length > 0) {
      result = NecessityCheckResult.ALTERNATIVE_SUGGESTED;
    }

    if (days > 14) {
      result = NecessityCheckResult.NEEDS_JUSTIFICATION;
      details.needsJustification = true;
      details.justificationReason = '出差时间超过14天，需要详细说明出差必要性';
    }

    logger.info(`必要性检查 - 目的: ${purpose}, 结果: ${result}, 替代方案数: ${alternatives.length}`);

    return { result, details, alternatives };
  }

  async estimateCost(
    travelType: TravelType,
    destination: string,
    departureCity: string,
    days: number,
    employeePreference: string
  ): Promise<CostEstimate> {
    const breakdown: Record<string, unknown> = {};
    const cityPrices: Record<string, { flight: number; hotel: number; meals: number }> = {
      '北京': { flight: 1200, hotel: 600, meals: 200 },
      '上海': { flight: 1300, hotel: 650, meals: 220 },
      '广州': { flight: 1100, hotel: 550, meals: 180 },
      '深圳': { flight: 1150, hotel: 580, meals: 200 },
      '杭州': { flight: 1000, hotel: 500, meals: 180 },
      '成都': { flight: 900, hotel: 450, meals: 150 },
      'default': { flight: 1000, hotel: 500, meals: 180 },
    };

    const destPrices = cityPrices[destination] || cityPrices['default'];
    const depPrices = cityPrices[departureCity] || cityPrices['default'];

    let flightMultiplier = 1;
    let hotelMultiplier = 1;
    let mealsMultiplier = 1;

    if (travelType === TravelType.INTERNATIONAL) {
      flightMultiplier = 5;
      hotelMultiplier = 2;
      mealsMultiplier = 2;
    }

    if (employeePreference === 'business') {
      flightMultiplier *= 1.8;
      hotelMultiplier *= 1.5;
    } else if (employeePreference === 'first_class') {
      flightMultiplier *= 3;
      hotelMultiplier *= 2;
    }

    const flight = (destPrices.flight + depPrices.flight) * flightMultiplier;
    const accommodation = destPrices.hotel * days * hotelMultiplier;
    const meals = destPrices.meals * days * mealsMultiplier;
    const transportation = 300;
    const other = 200;
    const total = flight + accommodation + meals + transportation + other;

    breakdown.basePrice = cityPrices[destination] || cityPrices['default'];
    breakdown.multipliers = {
      travelType: travelType === TravelType.INTERNATIONAL ? '国际(5x/2x/2x)' : '国内(1x)',
      preference: employeePreference,
    };
    breakdown.days = days;

    logger.info(`费用预估 - 目的地: ${destination}, 天数: ${days}, 总额: ${total.toFixed(2)}`);

    return {
      flight: Number(flight.toFixed(2)),
      accommodation: Number(accommodation.toFixed(2)),
      meals: Number(meals.toFixed(2)),
      transportation: Number(transportation.toFixed(2)),
      other: Number(other.toFixed(2)),
      total: Number(total.toFixed(2)),
      breakdown,
    };
  }

  async createApplication(request: CreateApplicationRequest): Promise<TravelApplication> {
    const t = await sequelize.transaction();

    try {
      const employee = await Employee.findByPk(request.employeeId, { transaction: t });
      if (!employee) {
        throw new Error('员工不存在');
      }

      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const necessityCheck = await this.checkNecessity(request.purpose, request.destination, days);
      const costEstimate = await this.estimateCost(
        request.travelType,
        request.destination,
        request.departureCity,
        days,
        employee.travelPreference
      );

      const budgetCheck = await BudgetService.checkBudget(
        employee.departmentId,
        costEstimate.total,
        startDate
      );

      const application = await TravelApplication.create(
        {
          applicationNo: this.generateApplicationNo(),
          employeeId: request.employeeId,
          departmentId: employee.departmentId,
          travelType: request.travelType,
          purpose: request.purpose,
          destination: request.destination,
          departureCity: request.departureCity,
          startDate,
          endDate,
          numberOfDays: days,
          estimatedCost: costEstimate.total,
          budgetCheckPassed: budgetCheck.passed,
          budgetOverrunRatio: budgetCheck.overrunRatio,
          necessityCheckResult: necessityCheck.result,
          necessityCheckDetails: necessityCheck.details,
          alternativeSuggestions: necessityCheck.alternatives,
          status: TravelApplicationStatus.DRAFT,
          approvalLevel: 0,
          notes: request.notes,
        },
        { transaction: t }
      );

      await t.commit();
      logger.info(`创建差旅申请 - 申请号: ${application.applicationNo}, 员工: ${request.employeeId}`);

      return application.reload({
        include: [
          { model: Employee, as: 'employee' },
          { model: Department, as: 'department' },
        ],
        transaction: null,
      });
    } catch (error) {
      await t.rollback();
      logger.error('创建差旅申请失败:', error);
      throw error;
    }
  }

  async submitApplication(applicationId: string, submitterId: string): Promise<TravelApplication> {
    const t = await sequelize.transaction();

    try {
      const application = await TravelApplication.findByPk(applicationId, { transaction: t });
      if (!application) {
        throw new Error('差旅申请不存在');
      }

      if (application.status !== TravelApplicationStatus.DRAFT) {
        throw new Error('只有草稿状态的申请可以提交');
      }

      if (application.employeeId !== submitterId) {
        throw new Error('只能提交自己的差旅申请');
      }

      const approver = await this.determineNextApprover(application, 1, t);
      if (!approver) {
        throw new Error('无法确定审批人');
      }

      await BudgetService.reserveBudget(
        application.departmentId,
        application.estimatedCost,
        application.startDate,
        t
      );

      application.status = TravelApplicationStatus.PENDING_APPROVAL;
      application.currentApproverId = approver.id;
      application.approvalLevel = 1;

      await application.save({ transaction: t });

      await t.commit();
      logger.info(`提交差旅申请 - 申请号: ${application.applicationNo}, 当前审批人: ${approver.id}`);

      return application.reload({
        include: [
          { model: Employee, as: 'employee' },
          { model: Department, as: 'department' },
        ],
      });
    } catch (error) {
      await t.rollback();
      logger.error('提交差旅申请失败:', error);
      throw error;
    }
  }

  async determineNextApprover(
    application: TravelApplication,
    level: number,
    transaction?: Transaction
  ): Promise<Employee | null> {
    const { config } = require('../config');

    if (level === 1) {
      const department = await Department.findByPk(application.departmentId, { transaction });
      if (department && department.managerId) {
        return Employee.findByPk(department.managerId, { transaction });
      }
    }

    const overrunRatio = application.budgetOverrunRatio;

    if (level === 2 && overrunRatio >= config.approval.directorThreshold) {
      const directors = await Employee.findAll({
        where: { role: EmployeeRole.DIRECTOR, isActive: true },
        transaction,
      });
      return directors[0] || null;
    }

    if (level === 3 && overrunRatio >= config.approval.cfoThreshold) {
      const cfos = await Employee.findAll({
        where: { role: EmployeeRole.CFO, isActive: true },
        transaction,
      });
      return cfos[0] || null;
    }

    return null;
  }

  async approveApplication(
    applicationId: string,
    approverId: string,
    comments?: string
  ): Promise<TravelApplication> {
    const t = await sequelize.transaction();

    try {
      const application = await TravelApplication.findByPk(applicationId, { transaction: t });
      if (!application) {
        throw new Error('差旅申请不存在');
      }

      if (application.status !== TravelApplicationStatus.PENDING_APPROVAL) {
        throw new Error('只有待审批状态的申请可以审批');
      }

      if (application.currentApproverId !== approverId) {
        throw new Error('当前审批人不匹配');
      }

      const approver = await Employee.findByPk(approverId, { transaction: t });
      if (!approver) {
        throw new Error('审批人不存在');
      }

      await ApprovalRecord.create(
        {
          applicationId,
          approverId,
          approverRole: approver.role,
          approverName: approver.name,
          approvalLevel: application.approvalLevel,
          action: 'approve',
          comments,
        },
        { transaction: t }
      );

      const { config } = require('../config');
      const overrunRatio = application.budgetOverrunRatio;
      let nextLevel = application.approvalLevel + 1;

      let needsMoreApproval = false;
      if (nextLevel === 2 && overrunRatio >= config.approval.directorThreshold) {
        needsMoreApproval = true;
      }
      if (nextLevel === 3 && overrunRatio >= config.approval.cfoThreshold) {
        needsMoreApproval = true;
      }

      if (needsMoreApproval) {
        const nextApprover = await this.determineNextApprover(application, nextLevel, t);
        if (nextApprover) {
          application.currentApproverId = nextApprover.id;
          application.approvalLevel = nextLevel;
          await application.save({ transaction: t });
          await t.commit();
          logger.info(`差旅申请通过 ${approver.role} 审批 - 申请号: ${application.applicationNo}, 进入下一级审批`);
          return application.reload();
        }
      }

      application.status = TravelApplicationStatus.APPROVED;
      application.currentApproverId = null;
      await application.save({ transaction: t });

      await t.commit();
      logger.info(`差旅申请审批通过 - 申请号: ${application.applicationNo}, 最终审批人: ${approver.name}`);

      return application.reload({
        include: [
          { model: Employee, as: 'employee' },
          { model: Department, as: 'department' },
          { model: ApprovalRecord, as: 'approvalRecords' },
        ],
      });
    } catch (error) {
      await t.rollback();
      logger.error('审批差旅申请失败:', error);
      throw error;
    }
  }

  async rejectApplication(
    applicationId: string,
    approverId: string,
    rejectionReason: string
  ): Promise<TravelApplication> {
    const t = await sequelize.transaction();

    try {
      const application = await TravelApplication.findByPk(applicationId, { transaction: t });
      if (!application) {
        throw new Error('差旅申请不存在');
      }

      if (application.status !== TravelApplicationStatus.PENDING_APPROVAL) {
        throw new Error('只有待审批状态的申请可以拒绝');
      }

      if (application.currentApproverId !== approverId) {
        throw new Error('当前审批人不匹配');
      }

      const approver = await Employee.findByPk(approverId, { transaction: t });
      if (!approver) {
        throw new Error('审批人不存在');
      }

      await ApprovalRecord.create(
        {
          applicationId,
          approverId,
          approverRole: approver.role,
          approverName: approver.name,
          approvalLevel: application.approvalLevel,
          action: 'reject',
          comments: rejectionReason,
        },
        { transaction: t }
      );

      await BudgetService.releaseReservedBudget(
        application.departmentId,
        application.estimatedCost,
        application.startDate,
        t
      );

      application.status = TravelApplicationStatus.REJECTED;
      application.currentApproverId = null;
      application.rejectionReason = rejectionReason;
      await application.save({ transaction: t });

      await t.commit();
      logger.info(`差旅申请被拒绝 - 申请号: ${application.applicationNo}, 拒绝人: ${approver.name}`);

      return application.reload();
    } catch (error) {
      await t.rollback();
      logger.error('拒绝差旅申请失败:', error);
      throw error;
    }
  }

  async getApplicationById(id: string): Promise<TravelApplication | null> {
    return TravelApplication.findByPk(id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: Department, as: 'department' },
        { model: ApprovalRecord, as: 'approvalRecords' },
      ],
    });
  }

  async getMyApplications(employeeId: string, page: number = 1, pageSize: number = 20): Promise<{
    data: TravelApplication[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { count, rows } = await TravelApplication.findAndCountAll({
      where: { employeeId },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      include: [
        { model: Employee, as: 'employee' },
        { model: Department, as: 'department' },
      ],
    });

    return {
      data: rows,
      total: count,
      page,
      pageSize,
    };
  }

  async getPendingApprovals(approverId: string, page: number = 1, pageSize: number = 20): Promise<{
    data: TravelApplication[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { count, rows } = await TravelApplication.findAndCountAll({
      where: {
        status: TravelApplicationStatus.PENDING_APPROVAL,
        currentApproverId: approverId,
      },
      order: [['createdAt', 'ASC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      include: [
        { model: Employee, as: 'employee' },
        { model: Department, as: 'department' },
      ],
    });

    return {
      data: rows,
      total: count,
      page,
      pageSize,
    };
  }

  async startTrip(applicationId: string): Promise<TravelApplication> {
    const application = await TravelApplication.findByPk(applicationId);
    if (!application) {
      throw new Error('差旅申请不存在');
    }

    if (application.status !== TravelApplicationStatus.APPROVED) {
      throw new Error('只有已审批通过的申请可以开始行程');
    }

    application.status = TravelApplicationStatus.IN_PROGRESS;
    await application.save();

    logger.info(`行程开始 - 申请号: ${application.applicationNo}`);
    return application.reload();
  }

  async completeTrip(applicationId: string): Promise<TravelApplication> {
    const application = await TravelApplication.findByPk(applicationId);
    if (!application) {
      throw new Error('差旅申请不存在');
    }

    if (application.status !== TravelApplicationStatus.IN_PROGRESS) {
      throw new Error('只有进行中的行程可以结束');
    }

    application.status = TravelApplicationStatus.COMPLETED;
    await application.save();

    logger.info(`行程结束 - 申请号: ${application.applicationNo}`);
    return application.reload();
  }
}

export default new TravelApplicationService();
