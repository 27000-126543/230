import { Sequelize } from 'sequelize';
import { config } from '../config';
import logger from '../utils/logger';

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    pool: {
      max: config.database.pool.max,
      min: config.database.pool.min,
      idle: config.database.pool.idle,
      acquire: 30000,
    },
    logging: config.env === 'development' ? (msg) => logger.debug(msg) : false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  }
);

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
};

export const syncDB = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    logger.info('数据库同步完成');
  } catch (error) {
    logger.error('数据库同步失败:', error);
    throw error;
  }
};

export default sequelize;
