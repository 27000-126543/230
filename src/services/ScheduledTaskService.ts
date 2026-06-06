import cron from 'node-cron';
import { Op } from 'sequelize';
import BudgetService from './BudgetService';
import ReportService from './ReportService';
import BookingService from './BookingService';
import LogAlertService from './LogAlertService';
import { TravelApplication, TravelApplicationStatus, Expense, ExpenseStatus, Budget } from '../models';
import logger from '../utils/logger';

class ScheduledTaskService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  startAllTasks(): void {
    logger.info('启动所有定时任务...');

    this.tasks.set('unlockExpiredBookings', cron.schedule('*/5 * * * *', () => {
      this.unlockExpiredBookings().catch((err) => logger.error('释放过期锁定失败:', err));
    }));

    this.tasks.set('checkApprovalTimeout', cron.schedule('0 * * * *', () => {
      this.checkApprovalTimeout().catch((err) => logger.error('检查审批超时失败:', err));
    }));

    this.tasks.set('generateMonthlyReport', cron.schedule('0 2 1 * *', () => {
      this.generateMonthlyReportTask().catch((err) => logger.error('生成月度报表失败:', err));
    }));

    this.tasks.set('budgetOverrunDeduction', cron.schedule('0 3 1 * *', () => {
      this.processBudgetOverrunDeduction().catch((err) => logger.error('超额扣减处理失败:', err));
    }));

    logger.info(`已启动 ${this.tasks.size} 个定时任务`);
  }

  stopAllTasks(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info(`停止定时任务: ${name}`);
    }
    this.tasks.clear();
  }

  async unlockExpiredBookings(): Promise<number> {
    const count = await BookingService.unlockExpiredLocks();
    if (count > 0) {
      logger.debug(`释放了 ${count} 个过期预订锁定`);
    }
    return count;
  }

  async checkApprovalTimeout(): Promise<void> {
    const timeoutHours = 24;
    const threshold = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

    const pendingApps = await TravelApplication.findAll({
      where: {
        status: TravelApplicationStatus.PENDING_APPROVAL,
        createdAt: { [Op.lt]: threshold },
      },
    });

    for (const app of pendingApps) {
      const hours = Math.round((Date.now() - app.createdAt.getTime()) / (1000 * 60 * 60));
      logger.warn(`审批超时 - 申请号: ${app.applicationNo}, 等待时间: ${hours}小时`);

      await LogAlertService.sendApprovalTimeoutAlert(
        app.id,
        app.applicationNo,
        hours
      );
    }

    if (pendingApps.length > 0) {
      logger.info(`检测到 ${pendingApps.length} 个超时审批申请`);
    }
  }

  async generateMonthlyReportTask(): Promise<void> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    logger.info(`开始生成月度报表: ${year}-${month}`);

    try {
      const report = await ReportService.generateMonthlyReport(year, month);
      const pdfPath = await ReportService.exportToPDF(report);
      const excelPath = await ReportService.exportToExcel(report);

      logger.info(`月度报表生成完成 - PDF: ${pdfPath}, Excel: ${excelPath}`);
    } catch (error) {
      logger.error('生成月度报表失败:', error);
    }
  }

  async processBudgetOverrunDeduction(): Promise<void> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    logger.info(`开始处理上月超额扣减: ${year}-${month}`);

    try {
      const lastMonthBudgets = await Budget.findAll({
        where: { year, month },
      });

      for (const budget of lastMonthBudgets) {
        const overrun = budget.usedAmount - budget.totalAmount;
        if (overrun > 0) {
          await BudgetService.deductOverrunFromNextMonth(
            budget.departmentId,
            overrun,
            year,
            month
          );

          logger.info(`部门 ${budget.departmentId} 超额扣减: ${overrun}`);
        }
      }

      logger.info('超额扣减处理完成');
    } catch (error) {
      logger.error('超额扣减处理失败:', error);
    }
  }

  async generateMonthlyReportManual(year: number, month: number): Promise<{
    report: any;
    pdfPath: string;
    excelPath: string;
  }> {
    const report = await ReportService.generateMonthlyReport(year, month);
    const pdfPath = await ReportService.exportToPDF(report);
    const excelPath = await ReportService.exportToExcel(report);

    return { report, pdfPath, excelPath };
  }
}

export default new ScheduledTaskService();
