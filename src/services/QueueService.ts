import Queue from 'bull';
import { config } from '../config';
import logger from '../utils/logger';
import ExpenseService from './ExpenseService';
import ReportService from './ReportService';
import LogAlertService from './LogAlertService';

export type QueueName = 'ocr' | 'report' | 'notification' | 'alert';

class QueueService {
  private queues: Map<QueueName, Queue.Queue> = new Map();

  async init(): Promise<void> {
    logger.info('初始化消息队列...');

    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
    };

    const ocrQueue = new Queue('ocr', { redis: redisConfig });
    ocrQueue.process(5, async (job) => {
      logger.info(`处理OCR任务: ${job.id}`);
      try {
        const { imagePath, applicationId, employeeId } = job.data;
        const result = await ExpenseService.performOCR(imagePath);
        return result;
      } catch (error) {
        logger.error(`OCR任务失败 ${job.id}:`, error);
        throw error;
      }
    });

    const reportQueue = new Queue('report', { redis: redisConfig });
    reportQueue.process(2, async (job) => {
      logger.info(`处理报表任务: ${job.id}`);
      try {
        const { year, month, format } = job.data;
        const report = await ReportService.generateMonthlyReport(year, month);

        if (format === 'pdf') {
          return await ReportService.exportToPDF(report);
        } else if (format === 'excel') {
          return await ReportService.exportToExcel(report);
        }
        return report;
      } catch (error) {
        logger.error(`报表任务失败 ${job.id}:`, error);
        throw error;
      }
    });

    const notificationQueue = new Queue('notification', { redis: redisConfig });
    notificationQueue.process(10, async (job) => {
      logger.info(`处理通知任务: ${job.id}`);
      try {
        const { type, data } = job.data;
        logger.info(`发送通知 [${type}]:`, data);
        return { success: true, type, data };
      } catch (error) {
        logger.error(`通知任务失败 ${job.id}:`, error);
        throw error;
      }
    });

    const alertQueue = new Queue('alert', { redis: redisConfig });
    alertQueue.process(10, async (job) => {
      logger.info(`处理预警任务: ${job.id}`);
      try {
        const alertParams = job.data;
        return await LogAlertService.createAlert(alertParams);
      } catch (error) {
        logger.error(`预警任务失败 ${job.id}:`, error);
        throw error;
      }
    });

    this.queues.set('ocr', ocrQueue);
    this.queues.set('report', reportQueue);
    this.queues.set('notification', notificationQueue);
    this.queues.set('alert', alertQueue);

    for (const [name, queue] of this.queues) {
      queue.on('completed', (job) => {
        logger.debug(`队列任务完成 [${name}]: ${job.id}`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`队列任务失败 [${name}] ${job?.id}:`, err);
      });
    }

    logger.info(`消息队列初始化完成，共 ${this.queues.size} 个队列`);
  }

  getQueue(name: QueueName): Queue.Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`队列不存在: ${name}`);
    }
    return queue;
  }

  async addJob(name: QueueName, data: Record<string, unknown>, options?: Queue.JobOptions): Promise<Queue.Job> {
    const queue = this.getQueue(name);
    const job = await queue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    });
    logger.debug(`添加任务到队列 [${name}]: ${job.id}`);
    return job;
  }

  async getJobStatus(name: QueueName, jobId: string): Promise<{
    status: string;
    result?: unknown;
    error?: string;
  }> {
    const queue = this.getQueue(name);
    const job = await queue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const result = state === 'completed' ? job.returnvalue : undefined;
    const error = job.failedReason;

    return { status: state, result, error };
  }

  async closeAll(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`队列已关闭: ${name}`);
    }
    this.queues.clear();
  }
}

export default new QueueService();
