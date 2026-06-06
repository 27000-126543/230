import { Op, fn, col, literal } from 'sequelize';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';
import {
  TravelApplication,
  TravelApplicationStatus,
  Expense,
  Budget,
  Employee,
  Department,
  Booking,
} from '../models';
import BudgetService from './BudgetService';
import logger from '../utils/logger';
import { config } from '../config';

export interface MonthlyReportData {
  year: number;
  month: number;
  departments: Array<{
    departmentId: string;
    departmentName: string;
    totalSpent: number;
    budget: number;
    budgetUsageRate: number;
    overrun: number;
    overrunCount: number;
    tripCount: number;
    employeeCount: number;
    avgPerTrip: number;
    avgPerEmployee: number;
    avgApprovalTime: number;
  }>;
  total: {
    totalSpent: number;
    budget: number;
    budgetUsageRate: number;
    overrun: number;
    overrunCount: number;
    tripCount: number;
    employeeCount: number;
  };
  trend: Array<{
    month: string;
    totalSpent: number;
    budget: number;
  }>;
}

export interface QueryFilters {
  employeeId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  status?: string;
}

class ReportService {
  async generateMonthlyReport(year: number, month: number): Promise<MonthlyReportData> {
    logger.info(`生成月度报表: ${year}-${month}`);

    const departments = await Department.findAll({ where: { isActive: true } });
    const deptReports = [];

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    for (const dept of departments) {
      const budget = await BudgetService.getDepartmentMonthlyBudget(dept.id, year, month);

      const applications = await TravelApplication.findAll({
        where: {
          departmentId: dept.id,
          startDate: { [Op.between]: [startOfMonth, endOfMonth] },
          status: { [Op.in]: [TravelApplicationStatus.COMPLETED, TravelApplicationStatus.IN_PROGRESS, TravelApplicationStatus.APPROVED] },
        },
      });

      const expenses = await Expense.findAll({
        include: [
          {
            model: TravelApplication,
            as: 'application',
            where: { departmentId: dept.id },
          },
        ],
        where: {
          expenseDate: { [Op.between]: [startOfMonth, endOfMonth] },
        },
      });

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const tripCount = applications.length;
      const uniqueEmployees = new Set(applications.map((a) => a.employeeId));
      const overrun = Math.max(0, totalSpent - budget.total);
      const overrunCount = budget.usageRate > 100 ? 1 : 0;

      const approvalTimes: number[] = [];
      for (const app of applications) {
        const approvalRecords = await app.$get('approvalRecords');
        if (approvalRecords.length > 0) {
          const firstApproval = approvalRecords[0];
          const timeDiff = firstApproval.approvedAt.getTime() - app.createdAt.getTime();
          approvalTimes.push(timeDiff / (1000 * 60 * 60));
        }
      }

      const avgApprovalTime = approvalTimes.length > 0
        ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
        : 0;

      deptReports.push({
        departmentId: dept.id,
        departmentName: dept.name,
        totalSpent: Number(totalSpent.toFixed(2)),
        budget: budget.total,
        budgetUsageRate: budget.total > 0 ? Math.round((totalSpent / budget.total) * 10000) / 100 : 0,
        overrun: Number(overrun.toFixed(2)),
        overrunCount,
        tripCount,
        employeeCount: uniqueEmployees.size,
        avgPerTrip: tripCount > 0 ? Number((totalSpent / tripCount).toFixed(2)) : 0,
        avgPerEmployee: uniqueEmployees.size > 0 ? Number((totalSpent / uniqueEmployees.size).toFixed(2)) : 0,
        avgApprovalTime: Math.round(avgApprovalTime * 100) / 100,
      });
    }

    const total = deptReports.reduce(
      (acc, d) => ({
        totalSpent: acc.totalSpent + d.totalSpent,
        budget: acc.budget + d.budget,
        overrun: acc.overrun + d.overrun,
        overrunCount: acc.overrunCount + d.overrunCount,
        tripCount: acc.tripCount + d.tripCount,
        employeeCount: acc.employeeCount + d.employeeCount,
      }),
      { totalSpent: 0, budget: 0, overrun: 0, overrunCount: 0, tripCount: 0, employeeCount: 0 }
    );

    const trend = await this.getMonthlyTrend(year, month, 6);

    return {
      year,
      month,
      departments: deptReports,
      total: {
        ...total,
        budgetUsageRate: total.budget > 0 ? Math.round((total.totalSpent / total.budget) * 10000) / 100 : 0,
      },
      trend,
    };
  }

  async getMonthlyTrend(currentYear: number, currentMonth: number, months: number): Promise<Array<{
    month: string;
    totalSpent: number;
    budget: number;
  }>> {
    const trend = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      const budgets = await Budget.findAll({
        where: { year, month },
      });
      const totalBudget = budgets.reduce((sum, b) => sum + b.totalAmount, 0);

      const expenses = await Expense.findAll({
        where: {
          expenseDate: {
            [Op.between]: [new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59)],
          },
        },
      });
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

      trend.push({
        month: monthStr,
        totalSpent: Number(totalSpent.toFixed(2)),
        budget: Number(totalBudget.toFixed(2)),
      });
    }

    return trend;
  }

  async queryExpenses(filters: QueryFilters, page: number = 1, pageSize: number = 50): Promise<{
    data: Expense[];
    total: number;
    page: number;
    pageSize: number;
    summary: {
      totalAmount: number;
      count: number;
    };
  }> {
    const where: Record<string, unknown> = {};
    const applicationWhere: Record<string, unknown> = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.startDate && filters.endDate) {
      where.expenseDate = { [Op.between]: [filters.startDate, filters.endDate] };
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.departmentId) {
      applicationWhere.departmentId = filters.departmentId;
    }

    const include = Object.keys(applicationWhere).length > 0
      ? [{ model: TravelApplication, as: 'application', where: applicationWhere }]
      : [{ model: TravelApplication, as: 'application' }];

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include,
      order: [['expenseDate', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const summary = {
      totalAmount: Number(rows.reduce((sum, e) => sum + e.amount, 0).toFixed(2)),
      count: rows.length,
    };

    return {
      data: rows,
      total: count,
      page,
      pageSize,
      summary,
    };
  }

  async exportToPDF(report: MonthlyReportData): Promise<string> {
    const fileName = `monthly_report_${report.year}_${String(report.month).padStart(2, '0')}.pdf`;
    const filePath = path.join(config.upload.dir, fileName);

    await fs.mkdir(config.upload.dir, { recursive: true });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.writeFile(filePath, '');

    return new Promise((resolve, reject) => {
      const writeStream = require('fs').createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.fontSize(18).text('企业差旅月度报表', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`报表期间: ${report.year}年${report.month}月`);
      doc.moveDown();

      doc.fontSize(14).text('一、总体情况');
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`总支出: ¥${report.total.totalSpent.toLocaleString()}`);
      doc.text(`总预算: ¥${report.total.budget.toLocaleString()}`);
      doc.text(`预算使用率: ${report.total.budgetUsageRate}%`);
      doc.text(`超支总额: ¥${report.total.overrun.toLocaleString()}`);
      doc.text(`超支部门数: ${report.total.overrunCount}`);
      doc.text(`出差次数: ${report.total.tripCount}`);
      doc.text(`出差人数: ${report.total.employeeCount}`);
      doc.moveDown();

      doc.fontSize(14).text('二、各部门明细');
      doc.moveDown(0.5);

      report.departments.forEach((dept) => {
        doc.fontSize(12).text(dept.departmentName, { underline: true });
        doc.fontSize(10);
        doc.text(`  支出: ¥${dept.totalSpent.toLocaleString()} / 预算: ¥${dept.budget.toLocaleString()} (${dept.budgetUsageRate}%)`);
        doc.text(`  出差次数: ${dept.tripCount}, 人均: ¥${dept.avgPerEmployee.toLocaleString()}`);
        doc.text(`  平均审批时长: ${dept.avgApprovalTime}小时`);
        doc.moveDown(0.3);
      });

      doc.moveDown();
      doc.fontSize(14).text('三、近6个月趋势');
      doc.moveDown(0.5);
      report.trend.forEach((t) => {
        doc.fontSize(10).text(
          `${t.month}: 支出 ¥${t.totalSpent.toLocaleString()} / 预算 ¥${t.budget.toLocaleString()}`
        );
      });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  }

  async exportToExcel(report: MonthlyReportData): Promise<string> {
    const fileName = `monthly_report_${report.year}_${String(report.month).padStart(2, '0')}.xlsx`;
    const filePath = path.join(config.upload.dir, fileName);

    await fs.mkdir(config.upload.dir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '企业差旅管理系统';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('汇总');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 20 },
      { header: '数值', key: 'value', width: 20 },
    ];

    summarySheet.addRows([
      { metric: '总支出', value: report.total.totalSpent },
      { metric: '总预算', value: report.total.budget },
      { metric: '预算使用率', value: `${report.total.budgetUsageRate}%` },
      { metric: '超支总额', value: report.total.overrun },
      { metric: '超支部门数', value: report.total.overrunCount },
      { metric: '出差次数', value: report.total.tripCount },
      { metric: '出差人数', value: report.total.employeeCount },
    ]);

    const deptSheet = workbook.addWorksheet('部门明细');
    deptSheet.columns = [
      { header: '部门', key: 'departmentName', width: 15 },
      { header: '总支出', key: 'totalSpent', width: 15 },
      { header: '预算', key: 'budget', width: 15 },
      { header: '预算使用率', key: 'budgetUsageRate', width: 12 },
      { header: '超支', key: 'overrun', width: 15 },
      { header: '出差次数', key: 'tripCount', width: 10 },
      { header: '人均费用', key: 'avgPerEmployee', width: 12 },
      { header: '平均审批时长(小时)', key: 'avgApprovalTime', width: 18 },
    ];

    report.departments.forEach((d) => deptSheet.addRow(d));

    const trendSheet = workbook.addWorksheet('趋势');
    trendSheet.columns = [
      { header: '月份', key: 'month', width: 15 },
      { header: '总支出', key: 'totalSpent', width: 15 },
      { header: '预算', key: 'budget', width: 15 },
    ];

    report.trend.forEach((t) => trendSheet.addRow(t));

    await workbook.xlsx.writeFile(filePath);
    logger.info(`Excel报表生成: ${filePath}`);

    return filePath;
  }

  async batchExportExpenses(filters: QueryFilters): Promise<string> {
    const result = await this.queryExpenses(filters, 1, 10000);

    const fileName = `expenses_export_${Date.now()}.xlsx`;
    const filePath = path.join(config.upload.dir, fileName);

    await fs.mkdir(config.upload.dir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('费用明细');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: '日期', key: 'expenseDate', width: 15 },
      { header: '类别', key: 'category', width: 12 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '商户', key: 'merchant', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '是否异常', key: 'isAnomaly', width: 10 },
      { header: '申请号', key: 'applicationNo', width: 20 },
      { header: '员工ID', key: 'employeeId', width: 36 },
    ];

    for (const exp of result.data) {
      const app = exp.application as any;
      sheet.addRow({
        id: exp.id,
        expenseDate: exp.expenseDate.toISOString().slice(0, 10),
        category: exp.category,
        amount: exp.amount,
        merchant: exp.merchant || '',
        status: exp.status,
        isAnomaly: exp.isAnomaly ? '是' : '否',
        applicationNo: app?.applicationNo || '',
        employeeId: exp.employeeId,
      });
    }

    await workbook.xlsx.writeFile(filePath);
    logger.info(`费用明细批量导出: ${filePath}, 共${result.total}条`);

    return filePath;
  }
}

export default new ReportService();
