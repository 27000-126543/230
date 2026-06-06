import sequelize from './index';
import logger from '../utils/logger';
import { setupAssociations } from '../models';

async function migrate() {
  try {
    logger.info('========================================');
    logger.info('  开始数据库迁移');
    logger.info('========================================');

    await sequelize.authenticate();
    logger.info('✓ 数据库连接验证成功');
    logger.info(`  主机: ${(sequelize as any).config.host}`);
    logger.info(`  数据库: ${(sequelize as any).config.database}`);
    logger.info(`  方言: ${sequelize.getDialect()}`);

    logger.info('  正在设置模型关联...');
    setupAssociations();
    logger.info('✓ 模型关联设置完成');

    const modelCount = Object.keys(sequelize.models).length;
    logger.info(`  已加载 ${modelCount} 个模型:`);
    Object.keys(sequelize.models).forEach((modelName) => {
      logger.info(`    - ${modelName}`);
    });

    logger.info('  正在同步表结构 (alter: true)...');
    await sequelize.sync({ alter: true });
    logger.info('✓ 数据库表结构同步完成');

    logger.info('========================================');
    logger.info('  数据库迁移完成!');
    logger.info('========================================');
    process.exit(0);
  } catch (error) {
    logger.error('========================================');
    logger.error('  数据库迁移失败!');
    logger.error('========================================');
    logger.error('错误详情:', error);
    process.exit(1);
  }
}

migrate();
