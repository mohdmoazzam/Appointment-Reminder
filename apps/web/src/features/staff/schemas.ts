import { z } from 'zod';
import { USER_ROLES } from '@/types/enums';
import { emailSchema, requiredText } from '@/lib/validation';
import type { CreateInviteRequest } from './types';

export const inviteSchema = z.object({
  email: emailSchema,
  first_name: requiredText('First name', 100),
  last_name: requiredText('Last name', 100),
  role: z.enum(USER_ROLES, { error: 'Choose a role' }),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;

export function toCreateInviteRequest(values: InviteFormValues): CreateInviteRequest {
  return {
    email: values.email,
    first_name: values.first_name,
    last_name: values.last_name,
    role: values.role,
  };
}
