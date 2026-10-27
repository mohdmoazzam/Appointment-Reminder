import type { SelectOption } from '@/components/ui/SelectField';
import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, USER_ROLES, USER_ROLE_LABELS } from '@/types/enums';

/** <select> options for the API's enums. */

export const BUSINESS_TYPE_OPTIONS: readonly SelectOption[] = BUSINESS_TYPES.map((type) => ({
  value: type,
  label: BUSINESS_TYPE_LABELS[type],
}));

export const USER_ROLE_OPTIONS: readonly SelectOption[] = USER_ROLES.map((role) => ({
  value: role,
  label: USER_ROLE_LABELS[role],
}));
