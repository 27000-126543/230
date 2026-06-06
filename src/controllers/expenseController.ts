import { Request, Response, NextFunction } from 'express';
import ExpenseService from '../services/ExpenseService';
import ReportService from '../services/ReportService';
import BudgetService from '../services/BudgetService';
import { AppError } from '../middleware/errorHandler';

export const createExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { applicationId, employeeId, category, amount, expenseDate, merchant, location } = req.body;
    const expense = await ExpenseService.createExpense(
      applicationId,
      employeeId,
      category,
      amount,
      new Date(expenseDate),
      undefined,
      undefined,
      undefined,
      merchant,
      location
    );
    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError('请上传小票图片', 400);
    }

    const { applicationId, employeeId } = req.body;
    if (!applicationId || !employeeId) {
      throw new AppError('缺少必要参数: applicationId, employeeId', 400);
    }

    const expense = await ExpenseService.uploadReceiptAndCreateExpense(
      applicationId,
      employeeId,
      req.file.buffer,
      req.file.originalname
    );

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const provideExplanation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { explanation } = req.body;
    const expense = await ExpenseService.provideExplanation(id, explanation);
    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const approveExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { approverId } = req.body;
    const expense = await ExpenseService.approveExpense(id, approverId);
    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const expense = await ExpenseService.getExpenseById(id);
    if (!expense) {
      throw new AppError('费用记录不存在', 404);
    }
    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpensesByApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const expenses = await ExpenseService.getExpensesByApplication(applicationId);
    const summary = await ExpenseService.getExpenseSummary(applicationId);
    res.json({
      success: true,
      data: { expenses, summary },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnomalyExpenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId } = req.query;
    const expenses = await ExpenseService.getAnomalyExpenses(employeeId as string | undefined);
    res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

export const queryExpenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, departmentId, startDate, endDate, category, status, page, pageSize } = req.query;

    const result = await ReportService.queryExpenses(
      {
        employeeId: employeeId as string | undefined,
        departmentId: departmentId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        category: category as string | undefined,
        status: status as string | undefined,
      },
      parseInt(page as string) || 1,
      parseInt(pageSize as string) || 20
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const batchExportExpenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, departmentId, startDate, endDate, category, status } = req.body;

    const filePath = await ReportService.batchExportExpenses({
      employeeId,
      departmentId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      category,
      status,
    });

    res.json({
      success: true,
      data: { filePath },
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { departmentId } = req.params;
    const { year, month } = req.query;

    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const budget = await BudgetService.getDepartmentMonthlyBudget(departmentId, currentYear, currentMonth);
    res.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBudgets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const budgets = await BudgetService.getAllDepartmentsBudget(currentYear, currentMonth);
    res.json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    next(error);
  }
};
