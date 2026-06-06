import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sequelize from './index';
import { Department, Employee, EmployeeRole, TravelPreference, Budget } from '../models';
import logger from '../utils/logger';

const seed = async (): Promise<void> => {
  try {
    logger.info('开始初始化种子数据...');

    await sequelize.sync({ force: true });

    const dept1Id = uuidv4();
    const dept2Id = uuidv4();
    const dept3Id = uuidv4();
    const managerId = uuidv4();
    const directorId = uuidv4();
    const cfoId = uuidv4();
    const staff1Id = uuidv4();
    const staff2Id = uuidv4();

    await Department.bulkCreate([
      {
        id: dept1Id,
        name: '技术研发部',
        code: 'TECH',
        description: '负责产品研发和技术支持',
        managerId,
        isActive: true,
      },
      {
        id: dept2Id,
        name: '市场营销部',
        code: 'MKT',
        description: '负责市场推广和客户拓展',
        isActive: true,
      },
      {
        id: dept3Id,
        name: '财务管理部',
        code: 'FIN',
        description: '负责财务预算和成本控制',
        managerId: cfoId,
        isActive: true,
      },
    ]);

    const passwordHash = await bcrypt.hash('password123', 10);

    await Employee.bulkCreate([
      {
        id: cfoId,
        employeeNo: 'E001',
        name: '张三',
        email: 'zhangsan@company.com',
        phone: '13800138001',
        departmentId: dept3Id,
        position: '首席财务官',
        role: EmployeeRole.CFO,
        travelPreference: TravelPreference.BUSINESS,
        passwordHash,
        isActive: true,
      },
      {
        id: directorId,
        employeeNo: 'E002',
        name: '李四',
        email: 'lisi@company.com',
        phone: '13800138002',
        departmentId: dept1Id,
        position: '技术总监',
        role: EmployeeRole.DIRECTOR,
        travelPreference: TravelPreference.BUSINESS,
        passwordHash,
        isActive: true,
      },
      {
        id: managerId,
        employeeNo: 'E003',
        name: '王五',
        email: 'wangwu@company.com',
        phone: '13800138003',
        departmentId: dept1Id,
        position: '研发经理',
        role: EmployeeRole.MANAGER,
        travelPreference: TravelPreference.ECONOMY,
        passwordHash,
        isActive: true,
      },
      {
        id: staff1Id,
        employeeNo: 'E004',
        name: '赵六',
        email: 'zhaoliu@company.com',
        phone: '13800138004',
        departmentId: dept1Id,
        position: '高级工程师',
        role: EmployeeRole.STAFF,
        travelPreference: TravelPreference.ECONOMY,
        passwordHash,
        isActive: true,
      },
      {
        id: staff2Id,
        employeeNo: 'E005',
        name: '钱七',
        email: 'qianqi@company.com',
        phone: '13800138005',
        departmentId: dept2Id,
        position: '市场专员',
        role: EmployeeRole.STAFF,
        travelPreference: TravelPreference.ECONOMY,
        passwordHash,
        isActive: true,
      },
    ]);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await Budget.bulkCreate([
      {
        departmentId: dept1Id,
        year,
        month,
        totalAmount: 100000,
        usedAmount: 15000,
        reservedAmount: 0,
      },
      {
        departmentId: dept2Id,
        year,
        month,
        totalAmount: 80000,
        usedAmount: 8000,
        reservedAmount: 0,
      },
      {
        departmentId: dept3Id,
        year,
        month,
        totalAmount: 50000,
        usedAmount: 2000,
        reservedAmount: 0,
      },
    ]);

    logger.info('种子数据初始化完成！');
    logger.info('默认账号: zhaoliu@company.com / password123 (普通员工)');
    logger.info('默认账号: wangwu@company.com / password123 (部门经理)');
    logger.info('默认账号: lisi@company.com / password123 (总监)');
    logger.info('默认账号: zhangsan@company.com / password123 (CFO)');

    process.exit(0);
  } catch (error) {
    logger.error('种子数据初始化失败:', error);
    process.exit(1);
  }
};

seed();
