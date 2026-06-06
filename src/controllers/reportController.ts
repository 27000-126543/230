import { Request, Response, NextFunction } from 'express';
import ReportService from '../services/ReportService';
import ScheduledTaskService from '../services/ScheduledTaskService';
import LogAlertService from '../services/LogAlertService';
import { AppError } from '../middleware/errorHandler';
import { Department, Employee, TravelApplication, Expense, Budget, Alert } from '../models';
import { Op } from 'sequelize';
import path from 'path';

export const generateMonthlyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const report = await ReportService.generateMonthlyReport(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const report = await ReportService.generateMonthlyReport(parseInt(year), parseInt(month));
    const filePath = await ReportService.exportToPDF(report);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const exportReportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const report = await ReportService.generateMonthlyReport(parseInt(year), parseInt(month));
    const filePath = await ReportService.exportToExcel(report);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const generateManualReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const result = await ScheduledTaskService.generateMonthlyReportManual(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOperationLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resourceType, resourceId, operatorId, operationType, level, startDate, endDate, page, pageSize } = req.query;

    const result = await LogAlertService.getOperationLogs(
      {
        resourceType: resourceType as any,
        resourceId: resourceId as string | undefined,
        operatorId: operatorId as string | undefined,
        operationType: operationType as any,
        level: level as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      },
      parseInt(page as string) || 1,
      parseInt(pageSize as string) || 50
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alerts = await LogAlertService.getPendingAlerts();
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { operatorId } = req.body;
    const alert = await LogAlertService.acknowledgeAlert(id, operatorId);
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { operatorId, resolutionNote } = req.body;
    const alert = await LogAlertService.resolveAlert(id, operatorId, resolutionNote);
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const getHealth = (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
};

export const getDepartments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departments = await Department.findAll({
      attributes: ['id', 'name', 'parentId', 'managerId'],
      order: [['name', 'ASC']],
    });
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employees = await Employee.findAll({
      attributes: ['id', 'name', 'email', 'role', 'departmentId', 'travelPreference'],
      order: [['name', 'ASC']],
    });
    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeRoles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roleMap = {
      STAFF: '普通员工',
      MANAGER: '部门经理',
      DIRECTOR: '总监',
      CFO: 'CFO',
      ADMIN: '管理员',
    };
    res.json({
      success: true,
      data: roleMap,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, departmentId } = req.query;
    const employeeIdStr = employeeId as string | undefined;
    const departmentIdStr = departmentId as string | undefined;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const where: any = {};
    if (employeeIdStr) {
      where.employeeId = employeeIdStr;
    }
    if (departmentIdStr) {
      where.departmentId = departmentIdStr;
    }

    const [myApplications, pendingApproval, monthExpenses, budget] = await Promise.all([
      TravelApplication.count({ where: { ...where, createdAt: { [Op.gte]: monthStart } } as any),
      TravelApplication.count({
        where: {
          status: 'PENDING_APPROVAL',
          ...(employeeIdStr ? { currentApproverId: employeeIdStr } : {}),
        },
      } as any),
      Expense.sum('amount', {
        where: {
          ...(employeeIdStr ? { employeeId: employeeIdStr } : {}),
          expenseDate: { [Op.between]: [monthStart, monthEnd] },
          status: { [Op.ne]: 'REJECTED' },
        },
      } as any),
      departmentIdStr
        ? Budget.findOne({
            where: {
              departmentId: departmentIdStr,
              year: now.getFullYear(),
              month: now.getMonth() + 1,
            },
          } as any)
        : null,
    ]);

    const totalExpense = monthExpenses || 0;
    const budgetLeft = budget ? Math.max(0, budget.totalAmount - budget.usedAmount - totalExpense) : 0;

    res.json({
      success: true,
      data: {
        myApplications,
        pendingApproval,
        totalExpense,
        budgetLeft,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, limit = 5 } = req.query;

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const applications = await TravelApplication.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string),
      attributes: ['id', 'applicationNo', 'purpose', 'destination', 'startDate', 'endDate', 'estimatedCost', 'status', 'createdAt'],
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

export const getTodoList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, limit = 10 } = req.query;

    const todos: any[] = [];

    const pendingApprovals = await TravelApplication.findAll({
      where: {
        status: 'PENDING_APPROVAL',
        ...(employeeId ? { currentApproverId: employeeId } : {}),
      },
      order: [['createdAt', 'ASC']],
      limit: Math.min(parseInt(limit as string), 5),
      attributes: ['id', 'applicationNo', 'purpose', 'destination', 'createdAt'],
    });

    pendingApprovals.forEach((app) => {
      todos.push({
        type: 'warning',
        content: `${app.destination}出差申请等待审批`,
        time: formatTimeAgo(app.createdAt),
      });
    });

    const anomalyExpenses = await Expense.findAll({
      where: {
        isAnomaly: true,
        ...(employeeId ? { employeeId } : {}),
      },
      order: [['createdAt', 'ASC']],
      limit: 3,
    });

    anomalyExpenses.forEach((exp) => {
      todos.push({
        type: 'danger',
        content: `费用异常待处理: ¥${exp.amount}`,
        time: formatTimeAgo(exp.createdAt),
      });
    });

    const pendingAlerts = await Alert.findAll({
      where: { status: 'PENDING' },
      order: [['createdAt', 'ASC']],
      limit: 3,
    });

    pendingAlerts.forEach((alert) => {
      todos.push({
        type: 'info',
        content: alert.message,
        time: formatTimeAgo(alert.createdAt),
      });
    });

    res.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    next(error);
  }
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}
