import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

export enum ExpenseCategory {
  TRANSPORTATION = 'transportation',
  ACCOMMODATION = 'accommodation',
  MEALS = 'meals',
  COMMUNICATION = 'communication',
  ENTERTAINMENT = 'entertainment',
  OTHER = 'other',
}

export enum ExpenseStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  ANOMALY = 'anomaly',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

interface ExpenseAttributes {
  id: string;
  applicationId: string;
  employeeId: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: Date;
  merchant?: string;
  location?: string;
  receiptImagePath?: string;
  ocrData?: Record<string, unknown>;
  ocrConfidence?: number;
  isMatched: boolean;
  matchingRule?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  explanation?: string;
  status: ExpenseStatus;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface ExpenseCreationAttributes extends Optional<ExpenseAttributes, 'id' | 'status' | 'isMatched' | 'isAnomaly' | 'currency'> {}

class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
  public id!: string;
  public applicationId!: string;
  public employeeId!: string;
  public category!: ExpenseCategory;
  public amount!: number;
  public currency!: string;
  public expenseDate!: Date;
  public merchant?: string;
  public location?: string;
  public receiptImagePath?: string;
  public ocrData?: Record<string, unknown>;
  public ocrConfidence?: number;
  public isMatched!: boolean;
  public matchingRule?: string;
  public isAnomaly!: boolean;
  public anomalyReason?: string;
  public explanation?: string;
  public status!: ExpenseStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Expense.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    applicationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'application_id',
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'employee_id',
    },
    category: {
      type: DataTypes.ENUM(...Object.values(ExpenseCategory)),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      get() {
        return parseFloat(this.getDataValue('amount') as unknown as string);
      },
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'CNY',
      allowNull: false,
    },
    expenseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expense_date',
    },
    merchant: {
      type: DataTypes.STRING(200),
    },
    location: {
      type: DataTypes.STRING(200),
    },
    receiptImagePath: {
      type: DataTypes.STRING(500),
      field: 'receipt_image_path',
    },
    ocrData: {
      type: DataTypes.JSONB,
      field: 'ocr_data',
    },
    ocrConfidence: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'ocr_confidence',
      get() {
        const value = this.getDataValue('ocrConfidence');
        return value !== undefined ? parseFloat(value as unknown as string) : undefined;
      },
    },
    isMatched: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_matched',
    },
    matchingRule: {
      type: DataTypes.STRING(100),
      field: 'matching_rule',
    },
    isAnomaly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_anomaly',
    },
    anomalyReason: {
      type: DataTypes.TEXT,
      field: 'anomaly_reason',
    },
    explanation: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ExpenseStatus)),
      defaultValue: ExpenseStatus.PENDING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Expense',
    tableName: 'expenses',
    indexes: [
      { fields: ['application_id'] },
      { fields: ['employee_id'] },
      { fields: ['expense_date'] },
      { fields: ['category'] },
      { fields: ['status'] },
      { fields: ['is_anomaly'] },
    ],
  }
);

export default Expense;
