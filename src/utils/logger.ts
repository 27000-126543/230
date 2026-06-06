import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  let msg = `${ts} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.env === 'production' ? json() : logFormat
  ),
  defaultMeta: { service: 'travel-management' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.logging.file }),
  ],
});

export default logger;
