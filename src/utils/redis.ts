import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import logger from './logger';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  const url = `redis://${config.redis.host}:${config.redis.port}`;

  redisClient = createClient({
    url,
    password: config.redis.password || undefined,
    database: config.redis.db,
  });

  redisClient.on('error', (err) => logger.error('Redis连接错误:', err));
  redisClient.on('connect', () => logger.info('Redis连接成功'));

  await redisClient.connect();

  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis连接已关闭');
  }
};

export class CacheService {
  private client: RedisClientType;
  private defaultTTL: number = 300;

  constructor() {
    this.client = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`缓存读取失败 [${key}]:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const t = ttl || this.defaultTTL;
      await this.client.setEx(key, t, JSON.stringify(value));
    } catch (error) {
      logger.error(`缓存写入失败 [${key}]:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`缓存删除失败 [${key}]:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.client.exists(key)) > 0;
    } catch (error) {
      return false;
    }
  }

  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1 && ttl) {
        await this.client.expire(key, ttl);
      }
      return count;
    } catch (error) {
      logger.error(`计数器递增失败 [${key}]:`, error);
      return 0;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      return [];
    }
  }

  async lock(key: string, ttl: number = 30): Promise<boolean> {
    try {
      const result = await this.client.set(key, '1', {
        NX: true,
        EX: ttl,
      });
      return result === 'OK';
    } catch (error) {
      return false;
    }
  }

  async unlock(key: string): Promise<void> {
    await this.del(key);
  }
}

export default CacheService;
