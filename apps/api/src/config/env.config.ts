import { ConfigService } from '@nestjs/config';

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  INVITE_TTL_DAYS: number;
  APP_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_FOLDER: string;
  MAIL_PROVIDER: MailProvider;
  MAIL_FROM_EMAIL: string;
  MAIL_FROM_NAME: string;
  BREVO_API_KEY: string;
  REDIS_URL: string;
  QUEUE_PREFIX: string;
}

/** "log" only prints emails to the console (development, tests). */
export const MAIL_PROVIDERS = ['brevo', 'log'] as const;
export type MailProvider = (typeof MAIL_PROVIDERS)[number];

/** Use this type when injecting config so `config.get(key, { infer: true })` is typed. */
export type AppConfigService = ConfigService<Env, true>;

const NODE_ENVS: Env['NODE_ENV'][] = ['development', 'production', 'test'];

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];

  const str = (key: keyof Env, fallback?: string): string => {
    const value = raw[key] ?? fallback;
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key} is required`);
      return '';
    }
    return value;
  };

  const int = (key: keyof Env, fallback: string): number => {
    const value = Number(str(key, fallback));
    if (!Number.isInteger(value) || value <= 0) {
      errors.push(`${key} must be a positive integer`);
    }
    return value;
  };

  const nodeEnv = str('NODE_ENV', 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
  }

  const port = Number(str('PORT', '3000'));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push('PORT must be a valid port number');
  }

  const mailProvider = str('MAIL_PROVIDER', 'log') as MailProvider;
  if (!MAIL_PROVIDERS.includes(mailProvider)) {
    errors.push(`MAIL_PROVIDER must be one of ${MAIL_PROVIDERS.join(', ')}`);
  }

  const env: Env = {
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGIN: str('CORS_ORIGIN', 'http://localhost:5173'),
    DATABASE_URL: str('DATABASE_URL'),
    JWT_SECRET: str('JWT_SECRET'),
    JWT_ACCESS_TTL_SECONDS: int('JWT_ACCESS_TTL_SECONDS', '900'),
    REFRESH_TOKEN_TTL_DAYS: int('REFRESH_TOKEN_TTL_DAYS', '30'),
    INVITE_TTL_DAYS: int('INVITE_TTL_DAYS', '7'),
    APP_URL: str('APP_URL', 'http://localhost:5173'),
    CLOUDINARY_CLOUD_NAME: str('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: str('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: str('CLOUDINARY_API_SECRET'),
    CLOUDINARY_FOLDER: str('CLOUDINARY_FOLDER', 'appointment-reminder'),
    MAIL_PROVIDER: mailProvider,
    // Must be a sender verified with the provider when sending for real.
    MAIL_FROM_EMAIL: str('MAIL_FROM_EMAIL', mailProvider === 'log' ? 'no-reply@localhost' : undefined),
    MAIL_FROM_NAME: str('MAIL_FROM_NAME', 'Appointment Reminder'),
    BREVO_API_KEY: mailProvider === 'brevo' ? str('BREVO_API_KEY') : '',
    REDIS_URL: str('REDIS_URL', 'redis://localhost:6380'),
    QUEUE_PREFIX: str('QUEUE_PREFIX', 'appointment-reminder'),
  };

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return env;
}
