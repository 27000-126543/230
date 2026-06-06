import { Transaction } from 'sequelize';
import { Budget, Department } from '../models';
import logger from '../utils/logger';

export interface BudgetCheckResult {
  passed: boolean;
  availableAmount: number;
  estimatedCost: number;
  overrunRatio: number;
  message: string;
}

class BudgetService {
  async getBudget(departmentId: string, year: number, month: number): Promise<Budget | null> {
    return Budget.findOne({
      where: { departmentId, year, month },
      include: [{ model: Department, as: 'department' }],
    });
  }

  async getOrCreateBudget(departmentId: string, year: number, month: number, transaction?: Transaction): Promise<Budget> {
    let budget = await Budget.findOne({
      where: { departmentId, year, month },
      transaction,
    });

    if (!budget) {
      const department = await Department.findByPk(departmentId, { transaction });
      if (!department) {
        throw new Error('部门不存在');
      }

      const defaultBudget = await this.calculateDefaultBudget(departmentId);
      budget = await Budget.create(
        {
          departmentId,
          year,
          month,
          totalAmount: defaultBudget,
          usedAmount: 0,
          reservedAmount: 0,
        },
        { transaction }
      );
      logger.info(`自动创建部门 ${departmentId} ${year}-${month} 预算: ${defaultBudget}`);
    }

    return budget;
  }

  async calculateDefaultBudget(departmentId: string): Promise<number> {
    const lastThreeMonths = [];
    const now = new Date();

    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      lastThreeMonths.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
    }

    const historyBudgets = await Budget.findAll({
      where: {
        departmentId,
        [require('sequelize').Op.or]: lastThreeMonths,
      },
    });

    if (historyBudgets.length === 0) {
      return 50000;
    }

    const avgUsed = historyBudgets.reduce((sum, b) => sum + b.usedAmount, 0) / historyBudgets.length;
    return Math.round(avgUsed * 1.2);
  }

  async checkBudget(departmentId: string, estimatedCost: number, travelDate: Date): Promise<BudgetCheckResult> {
    const year = travelDate.getFullYear();
    const month = travelDate.getMonth() + 1;

    const budget = await this.getOrCreateBudget(departmentId, year, month);
    const availableAmount = budget.totalAmount - budget.usedAmount - budget.reservedAmount;

    let passed = true;
    let overrunRatio = 0;
    let message = '预算充足';

    if (estimatedCost > availableAmount) {
      passed = false;
      overrunRatio = (estimatedCost - availableAmount) / budget.totalAmount;
      message = `预算不足，可用: ${availableAmount}, 预估: ${estimatedCost}`;
    }

    logger.info(`预算检查 - 部门: ${departmentId}, 预估: ${estimatedCost}, 可用: ${availableAmount}, 通过: ${passed}`);

    return {
      passed,
      availableAmount,
      estimatedCost,
      overrunRatio,
      message,
    };
  }

  async reserveBudget(departmentId: string, amount: number, travelDate: Date, transaction?: Transaction): Promise<Budget> {
    const year = travelDate.getFullYear();
    const month = travelDate.getMonth() + 1;

    const budget = await this.getOrCreateBudget(departmentId, year, month, transaction);
    budget.reservedAmount = Number((budget.reservedAmount + amount).toFixed(2));

    await budget.save({ transaction });
    logger.info(`预算预留 - 部门: ${departmentId}, 金额: ${amount}, 预留总额: ${budget.reservedAmount}`);

    return budget;
  }

  async releaseReservedBudget(departmentId: string, amount: number, travelDate: Date, transaction?: Transaction): Promise<Budget> {
    const year = travelDate.getFullYear();
    const month = travelDate.getMonth() + 1;

    const budget = await this.getOrCreateBudget(departmentId, year, month, transaction);
    budget.reservedAmount = Math.max(0, Number((budget.reservedAmount - amount).toFixed(2)));

    await budget.save({ transaction });
    logger.info(`预算释放 - 部门: ${departmentId}, 金额: ${amount}, 预留总额: ${budget.reservedAmount}`);

    return budget;
  }

  async consumeBudget(departmentId: string, amount: number, reservedAmount: number, travelDate: Date, transaction?: Transaction): Promise<Budget> {
    const year = travelDate.getFullYear();
    const month = travelDate.getMonth() + 1;

    const budget = await this.getOrCreateBudget(departmentId, year, month, transaction);

    budget.reservedAmount = Math.max(0, Number((budget.reservedAmount - reservedAmount).toFixed(2)));
    budget.usedAmount = Number((budget.usedAmount + amount).toFixed(2));

    await budget.save({ transaction });
    logger.info(`预算消耗 - 部门: ${departmentId}, 消耗: ${amount}, 释放预留: ${reservedAmount}, 已用总额: ${budget.usedAmount}`);

    return budget;
  }

  async deductOverrunFromNextMonth(departmentId: string, overrunAmount: number, currentYear: number, currentMonth: number): Promise<Budget> {
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    const budget = await this.getOrCreateBudget(departmentId, nextYear, nextMonth);
    budget.totalAmount = Math.max(0, Number((budget.totalAmount - overrunAmount).toFixed(2)));

    await budget.save();
    logger.info(`超额扣减 - 部门: ${departmentId}, 扣减: ${overrunAmount}, 下月预算调整为: ${budget.totalAmount}`);

    return budget;
  }

  async getDepartmentMonthlyBudget(departmentId: string, year: number, month: number): Promise<{
    total: number;
    used: number;
    reserved: number;
    available: number;
  }> {
    const budget = await this.getOrCreateBudget(departmentId, year, month);
    return {
      total: budget.totalAmount,
      used: budget.usedAmount,
      reserved: budget.reservedAmount,
      available: budget.totalAmount - budget.usedAmount - budget.reservedAmount,
    };
  }

  async getAllDepartmentsBudget(year: number, month: number): Promise<Array<{
    departmentId: string;
    departmentName: string;
    total: number;
    used: number;
    reserved: number;
    available: number;
    usageRate: number;
  }>> {
    const departments = await Department.findAll({ where: { isActive: true } });
    const results = [];

    for (const dept of departments) {
      const budget = await this.getOrCreateBudget(dept.id, year, month);
      const usageRate = budget.totalAmount > 0 ? (budget.usedAmount / budget.totalAmount) * 100 : 0;

      results.push({
        departmentId: dept.id,
        departmentName: dept.name,
        total: budget.totalAmount,
        used: budget.usedAmount,
        reserved: budget.reservedAmount,
        available: budget.totalAmount - budget.usedAmount - budget.reservedAmount,
        usageRate: Math.round(usageRate * 100) / 100,
      });
    }

    return results;
  }
}

export default new BudgetService();
