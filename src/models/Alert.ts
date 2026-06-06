import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

export enum AlertType {
  BUDGET_OVERRUN = 'budget_overrun',
  ANOMALY_EXPENSE = 'anomaly_expense',
  APPROVAL_TIMEOUT = 'approval_timeout',
  BOOKING_FAILURE = 'booking_failure',
  SYSTEM_ERROR = 'system_error',
  HIGH_CONCURRENCY = 'high_concurrency',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

interface AlertAttributes {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  resourceType?: string;
  resourceId?: string;
  recipientIds?: string[];
  channels?: string[];
  sentAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AlertCreationAttributes extends Optional<AlertAttributes, 'id' | 'status'> {}

class Alert extends Model<AlertAttributes, AlertCreationAttributes> implements AlertAttributes {
  public id!: string;
  public type!: AlertType;
  public severity!: AlertSeverity;
  public title!: string;
  public message!: string;
  public status!: AlertStatus;
  public resourceType?: string;
  public resourceId?: string;
  public recipientIds?: string[];
  public channels?: string[];
  public sentAt?: Date;
  public acknowledgedBy?: string;
  public acknowledgedAt?: Date;
  public metadata?: Record<string, unknown>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Alert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(AlertType)),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(AlertSeverity)),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(AlertStatus)),
      defaultValue: AlertStatus.PENDING,
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(50),
      field: 'resource_type',
    },
    resourceId: {
      type: DataTypes.UUID,
      field: 'resource_id',
    },
    recipientIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      field: 'recipient_ids',
    },
    channels: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    sentAt: {
      type: DataTypes.DATE,
      field: 'sent_at',
    },
    acknowledgedBy: {
      type: DataTypes.UUID,
      field: 'acknowledged_by',
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      field: 'acknowledged_at',
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  },
  {
    sequelize,
    modelName: 'Alert',
    tableName: 'alerts',
    indexes: [
      { fields: ['status'] },
      { fields: ['severity'] },
      { fields: ['type'] },
      { fields: ['created_at'] },
    ],
  }
);

export default Alert;
