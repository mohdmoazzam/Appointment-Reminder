import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';

/**
 * Requires a valid access token, then enforces @Roles(). Order matters: authenticate first.
 * Used by ProtectedController, or on a single route inside a PublicController (e.g. logout).
 */
export const Protected = () => applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), ApiBearerAuth());
