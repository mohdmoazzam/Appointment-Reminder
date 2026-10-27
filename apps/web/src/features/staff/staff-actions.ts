import { fullName } from '@/lib/names';
import type { User } from '@/types/models';
import type { UpdateStaffRequest } from './types';

/*
 * The changes an owner can make to a team member, and how each is worded in the UI. Keeping
 * them here keeps the table and the confirmation dialog in agreement.
 */

export type StaffAction = 'make-owner' | 'make-staff' | 'disable' | 'enable';

export interface PendingStaffAction {
  member: User;
  action: StaffAction;
}

/** Actions offered for a member. Nobody can disable themselves (the API refuses it too). */
export function availableStaffActions(member: User, isSelf: boolean): StaffAction[] {
  const actions: StaffAction[] = [member.role === 'owner' ? 'make-staff' : 'make-owner'];
  if (member.status === 'disabled') actions.push('enable');
  else if (!isSelf) actions.push('disable');
  return actions;
}

export function staffActionRequest(action: StaffAction): UpdateStaffRequest {
  switch (action) {
    case 'make-owner':
      return { role: 'owner' };
    case 'make-staff':
      return { role: 'staff' };
    case 'disable':
      return { status: 'disabled' };
    case 'enable':
      return { status: 'active' };
  }
}

export const STAFF_ACTION_LABELS: Record<StaffAction, string> = {
  'make-owner': 'Make owner',
  'make-staff': 'Make staff',
  disable: 'Disable',
  enable: 'Enable',
};

export interface StaffActionCopy {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  successMessage: string;
}

export function describeStaffAction({ member, action }: PendingStaffAction, isSelf: boolean): StaffActionCopy {
  const name = isSelf ? 'You' : fullName(member);

  switch (action) {
    case 'make-owner':
      return {
        title: `Make ${fullName(member)} an owner?`,
        message: 'Owners can edit the business, invite and remove staff, and change anyone’s role, including yours.',
        confirmLabel: 'Make owner',
        tone: 'primary',
        successMessage: `${name} ${isSelf ? 'are' : 'is'} now an owner`,
      };
    case 'make-staff':
      return {
        title: isSelf ? 'Give up owner access?' : `Make ${fullName(member)} staff?`,
        message: isSelf
          ? 'You will no longer be able to edit the business or manage staff. Another owner will have to make you an owner again.'
          : 'They will no longer be able to edit the business or manage staff.',
        confirmLabel: 'Make staff',
        tone: isSelf ? 'danger' : 'primary',
        successMessage: `${name} ${isSelf ? 'are' : 'is'} now staff`,
      };
    case 'disable':
      return {
        title: `Disable ${fullName(member)}?`,
        message:
          'They will be signed out on every device and won’t be able to sign in. Their history is kept and you can enable them again later.',
        confirmLabel: 'Disable',
        tone: 'danger',
        successMessage: `${name} has been disabled`,
      };
    case 'enable':
      return {
        title: `Enable ${fullName(member)}?`,
        message: 'They will be able to sign in again with their existing password.',
        confirmLabel: 'Enable',
        tone: 'primary',
        successMessage: `${name} has been enabled`,
      };
  }
}
