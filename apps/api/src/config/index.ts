import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_USER: z.string().default('localmed'),
  DB_PASSWORD: z.string().default('localmed_dev_password'),
  DB_NAME: z.string().default('localmed'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  OTP_LENGTH: z.string().transform(Number).default('6'),
  OTP_EXPIRY_SECONDS: z.string().transform(Number).default('300'),
  WEB_URL: z.string().default('http://localhost:3001'),
});

type Env = z.infer<typeof envSchema>;

function loadConfig(): Env & {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  corsOrigins: string[];
} {
  const env = envSchema.parse(process.env);

  return {
    ...env,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    corsOrigins: env.NODE_ENV === 'production'
      ? [env.WEB_URL]
      : [env.WEB_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  };
}

export const config = loadConfig();

// Database configuration for Knex
export const databaseConfig = {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './database/migrations',
    tableName: 'migrations',
  },
  seeds: {
    directory: './database/seeds',
  },
};

// Redis configuration
export const redisConfig = {
  host: new URL(config.REDIS_URL).hostname || 'localhost',
  port: parseInt(new URL(config.REDIS_URL).port) || 6379,
  password: new URL(config.REDIS_URL).password || undefined,
};

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

// OTP configuration
export const otpConfig = {
  length: config.OTP_LENGTH,
  expirySeconds: config.OTP_EXPIRY_SECONDS,
};