import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';
import { EmployeeRole } from './Employee';

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  TRANSFER = 'transfer',
}

interface ApprovalRecordAttributes {
  id: string;
  applicationId: string;
  approverId: string;
  approverRole: EmployeeRole;
  approverName: string;
  approvalLevel: number;
  action: ApprovalAction;
  comments?: string;
  approvedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface ApprovalRecordCreationAttributes extends Optional<ApprovalRecordAttributes, 'id' | 'approvedAt'> {}

class ApprovalRecord extends Model<ApprovalRecordAttributes, ApprovalRecordCreationAttributes> implements ApprovalRecordAttributes {
  public id!: string;
  public applicationId!: string;
  public approverId!: string;
  public approverRole!: EmployeeRole;
  public approverName!: string;
  public approvalLevel!: number;
  public action!: ApprovalAction;
  public comments?: string;
  public approvedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

ApprovalRecord.init(
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
    approverId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'approver_id',
    },
    approverRole: {
      type: DataTypes.ENUM(...Object.values(EmployeeRole)),
      allowNull: false,
      field: 'approver_role',
    },
    approverName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'approver_name',
    },
    approvalLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'approval_level',
    },
    action: {
      type: DataTypes.ENUM(...Object.values(ApprovalAction)),
      allowNull: false,
    },
    comments: {
      type: DataTypes.TEXT,
    },
    approvedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'approved_at',
    },
  },
  {
    sequelize,
    modelName: 'ApprovalRecord',
    tableName: 'approval_records',
    indexes: [
      { fields: ['application_id'] },
      { fields: ['approver_id'] },
    ],
  }
);

export default ApprovalRecord;
