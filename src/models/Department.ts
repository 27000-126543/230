import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

interface DepartmentAttributes {
  id: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  parentId?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, 'id' | 'isActive'> {}

class Department extends Model<DepartmentAttributes, DepartmentCreationAttributes> implements DepartmentAttributes {
  public id!: string;
  public name!: string;
  public code!: string;
  public description?: string;
  public managerId?: string;
  public parentId?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Department.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    managerId: {
      type: DataTypes.UUID,
      field: 'manager_id',
    },
    parentId: {
      type: DataTypes.UUID,
      field: 'parent_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
  }
);

export default Department;
