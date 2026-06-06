import Department from './Department';
import Employee from './Employee';
import Budget from './Budget';
import TravelApplication from './TravelApplication';
import ApprovalRecord from './ApprovalRecord';
import Booking from './Booking';
import Expense from './Expense';
import OperationLog from './OperationLog';
import Alert from './Alert';

const setupAssociations = (): void => {
  Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
  Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Department.hasMany(Budget, { foreignKey: 'departmentId', as: 'budgets' });
  Budget.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Department.hasMany(TravelApplication, { foreignKey: 'departmentId', as: 'travelApplications' });
  TravelApplication.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Employee.hasMany(TravelApplication, { foreignKey: 'employeeId', as: 'travelApplications' });
  TravelApplication.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  TravelApplication.hasMany(ApprovalRecord, { foreignKey: 'applicationId', as: 'approvalRecords' });
  ApprovalRecord.belongsTo(TravelApplication, { foreignKey: 'applicationId', as: 'application' });

  TravelApplication.hasMany(Booking, { foreignKey: 'applicationId', as: 'bookings' });
  Booking.belongsTo(TravelApplication, { foreignKey: 'applicationId', as: 'application' });

  TravelApplication.hasMany(Expense, { foreignKey: 'applicationId', as: 'expenses' });
  Expense.belongsTo(TravelApplication, { foreignKey: 'applicationId', as: 'application' });

  Employee.hasMany(Expense, { foreignKey: 'employeeId', as: 'expenses' });
  Expense.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
};

export {
  Department,
  Employee,
  Budget,
  TravelApplication,
  ApprovalRecord,
  Booking,
  Expense,
  OperationLog,
  Alert,
  setupAssociations,
};
