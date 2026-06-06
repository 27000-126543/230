import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

export enum TravelApplicationStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum NecessityCheckResult {
  PASSED = 'passed',
  ALTERNATIVE_SUGGESTED = 'alternative_suggested',
  NEEDS_JUSTIFICATION = 'needs_justification',
}

export enum TravelType {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international',
}

interface TravelApplicationAttributes {
  id: string;
  applicationNo: string;
  employeeId: string;
  departmentId: string;
  travelType: TravelType;
  purpose: string;
  destination: string;
  departureCity: string;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
  estimatedCost: number;
  budgetCheckPassed: boolean;
  budgetOverrunRatio: number;
  necessityCheckResult: NecessityCheckResult;
  necessityCheckDetails?: Record<string, unknown>;
  alternativeSuggestions?: string[];
  status: TravelApplicationStatus;
  currentApproverId?: string;
  approvalLevel: number;
  rejectionReason?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface TravelApplicationCreationAttributes extends Optional<TravelApplicationAttributes, 'id' | 'status' | 'approvalLevel' | 'budgetCheckPassed' | 'budgetOverrunRatio'> {}

class TravelApplication extends Model<TravelApplicationAttributes, TravelApplicationCreationAttributes> implements TravelApplicationAttributes {
  public id!: string;
  public applicationNo!: string;
  public employeeId!: string;
  public departmentId!: string;
  public travelType!: TravelType;
  public purpose!: string;
  public destination!: string;
  public departureCity!: string;
  public startDate!: Date;
  public endDate!: Date;
  public numberOfDays!: number;
  public estimatedCost!: number;
  public budgetCheckPassed!: boolean;
  public budgetOverrunRatio!: number;
  public necessityCheckResult!: NecessityCheckResult;
  public necessityCheckDetails?: Record<string, unknown>;
  public alternativeSuggestions?: string[];
  public status!: TravelApplicationStatus;
  public currentApproverId?: string;
  public approvalLevel!: number;
  public rejectionReason?: string;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

TravelApplication.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    applicationNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'application_no',
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'employee_id',
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'department_id',
    },
    travelType: {
      type: DataTypes.ENUM(...Object.values(TravelType)),
      allowNull: false,
      field: 'travel_type',
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    departureCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'departure_city',
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date',
    },
    numberOfDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'number_of_days',
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'estimated_cost',
      get() {
        return parseFloat(this.getDataValue('estimatedCost') as unknown as string);
      },
    },
    budgetCheckPassed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'budget_check_passed',
    },
    budgetOverrunRatio: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0,
      field: 'budget_overrun_ratio',
      get() {
        return parseFloat(this.getDataValue('budgetOverrunRatio') as unknown as string);
      },
    },
    necessityCheckResult: {
      type: DataTypes.ENUM(...Object.values(NecessityCheckResult)),
      allowNull: false,
      field: 'necessity_check_result',
    },
    necessityCheckDetails: {
      type: DataTypes.JSONB,
      field: 'necessity_check_details',
    },
    alternativeSuggestions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'alternative_suggestions',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TravelApplicationStatus)),
      defaultValue: TravelApplicationStatus.DRAFT,
      allowNull: false,
    },
    currentApproverId: {
      type: DataTypes.UUID,
      field: 'current_approver_id',
    },
    approvalLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'approval_level',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      field: 'rejection_reason',
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'TravelApplication',
    tableName: 'travel_applications',
    indexes: [
      { fields: ['employee_id'] },
      { fields: ['department_id'] },
      { fields: ['status'] },
      { fields: ['start_date'] },
    ],
  }
);

export default TravelApplication;
