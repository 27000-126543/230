import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database';

export enum EmployeeRole {
  STAFF = 'staff',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  CFO = 'cfo',
  ADMIN = 'admin',
}

export enum TravelPreference {
  ECONOMY = 'economy',
  BUSINESS = 'business',
  FIRST_CLASS = 'first_class',
}

interface EmployeeAttributes {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone?: string;
  departmentId: string;
  position: string;
  role: EmployeeRole;
  travelPreference: TravelPreference;
  passwordHash: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface EmployeeCreationAttributes extends Optional<EmployeeAttributes, 'id' | 'isActive' | 'travelPreference'> {}

class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  public id!: string;
  public employeeNo!: string;
  public name!: string;
  public email!: string;
  public phone?: string;
  public departmentId!: string;
  public position!: string;
  public role!: EmployeeRole;
  public travelPreference!: TravelPreference;
  public passwordHash!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Employee.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employeeNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'employee_no',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'department_id',
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(EmployeeRole)),
      allowNull: false,
      defaultValue: EmployeeRole.STAFF,
    },
    travelPreference: {
      type: DataTypes.ENUM(...Object.values(TravelPreference)),
      defaultValue: TravelPreference.ECONOMY,
      field: 'travel_preference',
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
  }
);

export default Employee;
