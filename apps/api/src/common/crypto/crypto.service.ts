import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { user_role } from '../database/prisma/generated/client.js';

/** Claims carried in the access token. `bid` is the business (tenant) id, `sid` the session. */
export interface JwtPayload {
  sub: string;
  bid: string;
  sid: string;
  role: user_role;
}

export interface OpaqueToken {
  token: string;
  token_hash: string;
}

/** Password hashing, access-token signing and opaque (refresh / invite) tokens. */
@Injectable()
export class CryptoService {
  private dummyHash?: Promise<string>;

  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  hashPassword(plain: string): Promise<string> {
    return hash(plain);
  }

  verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
    return verify(passwordHash, plain);
  }

  /** Burns the same time as a real verify, so unknown emails can't be detected by timing. */
  async verifyAgainstDummy(plain: string): Promise<void> {
    this.dummyHash ??= hash(randomBytes(16).toString('hex'));
    await verify(await this.dummyHash, plain);
  }

  signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  /** 32 random bytes; only the SHA-256 hash is stored. */
  generateOpaqueToken(): OpaqueToken {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      token_hash: this.hashToken(token),
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
