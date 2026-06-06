import { Transaction, Op } from 'sequelize';
import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs/promises';
import {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  TravelApplication,
  Booking,
  BookingType,
} from '../models';
import logger from '../utils/logger';
import sequelize from '../database';
import { config } from '../config';

export interface OCRResult {
  amount?: number;
  date?: Date;
  merchant?: string;
  category?: ExpenseCategory;
  confidence: number;
  rawText: string;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  reasons: string[];
  matchedBooking?: Booking;
  matchingRule?: string;
}

class ExpenseService {
  async performOCR(imagePath: string): Promise<OCRResult> {
    try {
      logger.info(`开始OCR识别: ${imagePath}`);

      const result = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR进度: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text;
      const confidence = result.data.confidence;

      const extracted = this.parseOCRText(text);

      logger.info(`OCR识别完成 - 置信度: ${confidence}%, 金额: ${extracted.amount}`);

      return {
        ...extracted,
        confidence,
        rawText: text,
      };
    } catch (error) {
      logger.error('OCR识别失败:', error);
      throw new Error('OCR识别失败');
    }
  }

  parseOCRText(text: string): Partial<OCRResult> {
    const result: Partial<OCRResult> = {};

    const amountPatterns = [
      /(?:金额|合计|总计|total|amount)[:：]?\s*[￥¥$]?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
      /[￥¥$]\s*([0-9]+(?:\.[0-9]{1,2})?)/,
      /([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元|圆)/,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.amount = parseFloat(match[1]);
        break;
      }
    }

    const datePatterns = [
      /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/,
      /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let year, month, day;
        if (match[1].length === 4) {
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }
        result.date = new Date(year, month - 1, day);
        break;
      }
    }

    const merchantKeywords = ['酒店', '宾馆', '饭店', '餐厅', '餐饮', '航空', '机场', '高铁', '火车', '出租', '滴滴'];
    for (const keyword of merchantKeywords) {
      if (text.includes(keyword)) {
        result.merchant = keyword;
        break;
      }
    }

    result.category = this.categorizeExpense(text, result.merchant);

    return result;
  }

  categorizeExpense(text: string, merchant?: string): ExpenseCategory {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('航空') || lowerText.includes('飞机') || lowerText.includes('flight') || lowerText.includes('机票')) {
      return ExpenseCategory.TRANSPORTATION;
    }
    if (lowerText.includes('酒店') || lowerText.includes('宾馆') || lowerText.includes('hotel') || lowerText.includes('住宿')) {
      return ExpenseCategory.ACCOMMODATION;
    }
    if (lowerText.includes('餐') || lowerText.includes('饭') || lowerText.includes('restaurant') || lowerText.includes('meal')) {
      return ExpenseCategory.MEALS;
    }
    if (lowerText.includes('出租') || lowerText.includes('滴滴') || lowerText.includes('taxi') || lowerText.includes('打车')) {
      return ExpenseCategory.TRANSPORTATION;
    }
    if (lowerText.includes('通讯') || lowerText.includes('电话') || lowerText.includes('话费')) {
      return ExpenseCategory.COMMUNICATION;
    }

    if (merchant) {
      if (['酒店', '宾馆'].includes(merchant)) return ExpenseCategory.ACCOMMODATION;
      if (['饭店', '餐厅', '餐饮'].includes(merchant)) return ExpenseCategory.MEALS;
      if (['航空', '机场', '高铁', '火车', '出租', '滴滴'].includes(merchant)) return ExpenseCategory.TRANSPORTATION;
    }

    return ExpenseCategory.OTHER;
  }

  async createExpense(
    applicationId: string,
    employeeId: string,
    category: ExpenseCategory,
    amount: number,
    expenseDate: Date,
    receiptImagePath?: string,
    ocrData?: Record<string, unknown>,
    ocrConfidence?: number,
    merchant?: string,
    location?: string
  ): Promise<Expense> {
    const t = await sequelize.transaction();

    try {
      const application = await TravelApplication.findByPk(applicationId, { transaction: t });
      if (!application) {
        throw new Error('差旅申请不存在');
      }

      const expense = await Expense.create(
        {
          applicationId,
          employeeId,
          category,
          amount,
          expenseDate,
          receiptImagePath,
          ocrData,
          ocrConfidence,
          merchant,
          location,
          status: ExpenseStatus.PENDING,
        },
        { transaction: t }
      );

      const matchResult = await this.matchExpenseWithBookings(expense, application, t);

      if (matchResult.isAnomaly) {
        expense.isAnomaly = true;
        expense.anomalyReason = matchResult.reasons.join('; ');
        expense.status = ExpenseStatus.ANOMALY;
      } else {
        expense.isMatched = true;
        expense.matchingRule = matchResult.matchingRule;
        expense.status = ExpenseStatus.MATCHED;
      }

      await expense.save({ transaction: t });
      await t.commit();

      logger.info(`创建费用记录 - 申请: ${applicationId}, 金额: ${amount}, 类别: ${category}, 异常: ${expense.isAnomaly}`);

      return expense.reload();
    } catch (error) {
      await t.rollback();
      logger.error('创建费用记录失败:', error);
      throw error;
    }
  }

  async matchExpenseWithBookings(
    expense: Expense,
    application: TravelApplication,
    transaction?: Transaction
  ): Promise<AnomalyDetectionResult> {
    const reasons: string[] = [];
    let matchedBooking: Booking | undefined;
    let matchingRule: string | undefined;

    const bookings = await Booking.findAll({
      where: { applicationId: application.id },
      transaction,
    });

    const expenseDate = new Date(expense.expenseDate);
    const tripStart = new Date(application.startDate);
    const tripEnd = new Date(application.endDate);

    tripEnd.setHours(23, 59, 59, 999);

    if (expenseDate < tripStart || expenseDate > tripEnd) {
      reasons.push('消费日期不在出差时间范围内');
    }

    if (expense.category === ExpenseCategory.ACCOMMODATION) {
      const hotelBookings = bookings.filter((b) => b.bookingType === BookingType.HOTEL);
      if (hotelBookings.length > 0) {
        matchedBooking = hotelBookings[0];
        matchingRule = '已匹配酒店预订';

        const hotelPrice = matchedBooking.price;
        if (expense.amount > hotelPrice * 1.2) {
          reasons.push(`住宿费用超出预订价格20%以上 (预订: ${hotelPrice}, 实际: ${expense.amount})`);
        }
      }
    }

    if (expense.category === ExpenseCategory.TRANSPORTATION) {
      const flightBookings = bookings.filter((b) => b.bookingType === BookingType.FLIGHT);
      if (flightBookings.length > 0) {
        matchedBooking = flightBookings[0];
        matchingRule = '已匹配航班预订';
      }
    }

    if (expense.category === ExpenseCategory.MEALS) {
      const maxMealsPerDay = 300;
      const days = application.numberOfDays;
      const totalMealsBudget = maxMealsPerDay * days;
      const allMealExpenses = await Expense.sum('amount', {
        where: {
          applicationId: application.id,
          category: ExpenseCategory.MEALS,
          id: { [Op.ne]: expense.id },
        },
        transaction,
      });

      if ((allMealExpenses || 0) + expense.amount > totalMealsBudget) {
        reasons.push(`餐饮费用超出预算 (预算: ${totalMealsBudget}, 累计: ${(allMealExpenses || 0) + expense.amount})`);
      } else {
        matchingRule = '餐饮费用在预算内';
      }
    }

    return {
      isAnomaly: reasons.length > 0,
      reasons,
      matchedBooking,
      matchingRule,
    };
  }

  async uploadReceiptAndCreateExpense(
    applicationId: string,
    employeeId: string,
    imageBuffer: Buffer,
    originalName: string
  ): Promise<Expense> {
    const uploadDir = config.upload.dir;
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${path.extname(originalName)}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, imageBuffer);

    const ocrResult = await this.performOCR(filePath);

    if (!ocrResult.amount) {
      throw new Error('无法识别小票金额');
    }

    return this.createExpense(
      applicationId,
      employeeId,
      ocrResult.category || ExpenseCategory.OTHER,
      ocrResult.amount,
      ocrResult.date || new Date(),
      filePath,
      { rawText: ocrResult.rawText },
      ocrResult.confidence,
      ocrResult.merchant
    );
  }

  async provideExplanation(expenseId: string, explanation: string): Promise<Expense> {
    const expense = await Expense.findByPk(expenseId);
    if (!expense) {
      throw new Error('费用记录不存在');
    }

    if (!expense.isAnomaly) {
      throw new Error('该费用没有异常');
    }

    expense.explanation = explanation;
    expense.status = ExpenseStatus.PENDING;
    expense.isAnomaly = false;
    await expense.save();

    logger.info(`异常费用已说明 - 费用ID: ${expenseId}, 说明: ${explanation.substring(0, 50)}...`);
    return expense.reload();
  }

  async approveExpense(expenseId: string, approverId: string): Promise<Expense> {
    const expense = await Expense.findByPk(expenseId);
    if (!expense) {
      throw new Error('费用记录不存在');
    }

    if (expense.status !== ExpenseStatus.MATCHED && expense.status !== ExpenseStatus.PENDING) {
      throw new Error('只能审批已匹配或待审核的费用');
    }

    expense.status = ExpenseStatus.APPROVED;
    await expense.save();

    logger.info(`费用审批通过 - 费用ID: ${expenseId}, 审批人: ${approverId}`);
    return expense.reload();
  }

  async getExpensesByApplication(applicationId: string): Promise<Expense[]> {
    return Expense.findAll({
      where: { applicationId },
      order: [['expenseDate', 'ASC']],
    });
  }

  async getAnomalyExpenses(employeeId?: string): Promise<Expense[]> {
    const where: Record<string, unknown> = { isAnomaly: true };
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return Expense.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    return Expense.findByPk(id, {
      include: [
        { model: TravelApplication, as: 'application' },
      ],
    });
  }

  async getExpenseSummary(applicationId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    anomalyCount: number;
    approvedCount: number;
    pendingCount: number;
  }> {
    const expenses = await this.getExpensesByApplication(applicationId);

    const summary = {
      total: 0,
      byCategory: {} as Record<string, number>,
      anomalyCount: 0,
      approvedCount: 0,
      pendingCount: 0,
    };

    for (const exp of expenses) {
      summary.total += exp.amount;
      summary.byCategory[exp.category] = (summary.byCategory[exp.category] || 0) + exp.amount;

      if (exp.isAnomaly) summary.anomalyCount++;
      if (exp.status === ExpenseStatus.APPROVED) summary.approvedCount++;
      if (exp.status === ExpenseStatus.PENDING || exp.status === ExpenseStatus.ANOMALY) summary.pendingCount++;
    }

    return summary;
  }
}

export default new ExpenseService();
