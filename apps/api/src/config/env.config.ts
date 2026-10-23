import { ConfigService } from '@nestjs/config';

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
}

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

  const nodeEnv = str('NODE_ENV', 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
  }

  const port = Number(str('PORT', '3000'));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push('PORT must be a valid port number');
  }

  const env: Env = {
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGIN: str('CORS_ORIGIN', 'http://localhost:5173'),
    DATABASE_URL: str('DATABASE_URL'),
    JWT_SECRET: str('JWT_SECRET'),
  };

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  return env;
}
