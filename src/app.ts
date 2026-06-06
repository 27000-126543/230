import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './utils/logger';
import { connectDB, syncDB } from './database';
import { setupAssociations } from './models';
import { connectRedis } from './utils/redis';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import ScheduledTaskService from './services/ScheduledTaskService';
import QueueService from './services/QueueService';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      message: '请求过于频繁，请稍后再试',
      code: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`接收到 ${signal} 信号，正在关闭服务...`);

  try {
    ScheduledTaskService.stopAllTasks();
    await QueueService.closeAll();
    logger.info('服务已正常关闭');
    process.exit(0);
  } catch (error) {
    logger.error('服务关闭失败:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', promise, reason);
  process.exit(1);
});

const startServer = async (): Promise<void> => {
  try {
    logger.info('正在启动企业差旅管理系统...');

    await connectDB();
    setupAssociations();
    await syncDB(config.env === 'development');

    if (config.env !== 'test') {
      try {
        await connectRedis();
        await QueueService.init();
      } catch (redisError) {
        logger.warn('Redis连接失败，缓存和队列功能将不可用:', redisError);
      }
    }

    ScheduledTaskService.startAllTasks();

    app.listen(config.port, () => {
      logger.info(`服务已启动，监听端口: ${config.port}`);
      logger.info(`环境: ${config.env}`);
      logger.info(`API文档: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('服务启动失败:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
