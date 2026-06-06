import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  CANCEL = 'cancel',
  UPLOAD = 'upload',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export enum ResourceType {
  TRAVEL_APPLICATION = 'travel_application',
  BOOKING = 'booking',
  EXPENSE = 'expense',
  BUDGET = 'budget',
  EMPLOYEE = 'employee',
  DEPARTMENT = 'department',
  APPROVAL_RECORD = 'approval_record',
}

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

interface OperationLogAttributes {
  id: string;
  operationType: OperationType;
  resourceType: ResourceType;
  resourceId?: string;
  operatorId?: string;
  operatorName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  level: LogLevel;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OperationLogCreationAttributes extends Optional<OperationLogAttributes, 'id' | 'level'> {}

class OperationLog extends Model<OperationLogAttributes, OperationLogCreationAttributes> implements OperationLogAttributes {
  public id!: string;
  public operationType!: OperationType;
  public resourceType!: ResourceType;
  public resourceId?: string;
  public operatorId?: string;
  public operatorName?: string;
  public details?: Record<string, unknown>;
  public ipAddress?: string;
  public userAgent?: string;
  public level!: LogLevel;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OperationLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    operationType: {
      type: DataTypes.ENUM(...Object.values(OperationType)),
      allowNull: false,
      field: 'operation_type',
    },
    resourceType: {
      type: DataTypes.ENUM(...Object.values(ResourceType)),
      allowNull: false,
      field: 'resource_type',
    },
    resourceId: {
      type: DataTypes.UUID,
      field: 'resource_id',
    },
    operatorId: {
      type: DataTypes.UUID,
      field: 'operator_id',
    },
    operatorName: {
      type: DataTypes.STRING(100),
      field: 'operator_name',
    },
    details: {
      type: DataTypes.JSONB,
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.STRING(500),
      field: 'user_agent',
    },
    level: {
      type: DataTypes.ENUM(...Object.values(LogLevel)),
      defaultValue: LogLevel.INFO,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'OperationLog',
    tableName: 'operation_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['resource_type', 'resource_id'] },
      { fields: ['operator_id'] },
      { fields: ['created_at'] },
      { fields: ['level'] },
      { fields: ['operation_type'] },
    ],
  }
);

export default OperationLog;
