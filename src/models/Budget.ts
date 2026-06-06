import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

interface BudgetAttributes {
  id: string;
  departmentId: string;
  year: number;
  month: number;
  totalAmount: number;
  usedAmount: number;
  reservedAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface BudgetCreationAttributes extends Optional<BudgetAttributes, 'id' | 'usedAmount' | 'reservedAmount'> {}

class Budget extends Model<BudgetAttributes, BudgetCreationAttributes> implements BudgetAttributes {
  public id!: string;
  public departmentId!: string;
  public year!: number;
  public month!: number;
  public totalAmount!: number;
  public usedAmount!: number;
  public reservedAmount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  public get availableAmount(): number {
    return this.totalAmount - this.usedAmount - this.reservedAmount;
  }
}

Budget.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'department_id',
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'total_amount',
      get() {
        return parseFloat(this.getDataValue('totalAmount') as unknown as string);
      },
    },
    usedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'used_amount',
      get() {
        return parseFloat(this.getDataValue('usedAmount') as unknown as string);
      },
    },
    reservedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'reserved_amount',
      get() {
        return parseFloat(this.getDataValue('reservedAmount') as unknown as string);
      },
    },
  },
  {
    sequelize,
    modelName: 'Budget',
    tableName: 'budgets',
    indexes: [
      {
        unique: true,
        fields: ['department_id', 'year', 'month'],
      },
    ],
  }
);

export default Budget;
