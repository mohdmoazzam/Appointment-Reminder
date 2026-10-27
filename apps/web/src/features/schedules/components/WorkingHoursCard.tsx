import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { useToast } from '@/components/toast/use-toast';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { SaveBar } from '@/components/ui/SaveBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { formatTimeOfDay } from '@/lib/date';
import { formatDuration } from '@/lib/durations';
import type { WorkingHoursInterval } from '@/types/models';
import { useSetWorkingHours, useWorkingHours } from '../queries';
import { weeklyScheduleSchema } from '../schemas';
import {
  DAYS_IN_DISPLAY_ORDER,
  DAY_NAMES,
  MAX_SESSIONS_PER_DAY,
  SCHEDULE_TEMPLATES,
  WEEKDAY_INDEXES,
  applyTemplate,
  defaultSession,
  summarizeDay,
  summarizeWeek,
  toWeeklyScheduleFormValues,
  toWorkingHoursIntervals,
  withSortedSessions,
  type DayFormValues,
  type SessionFormValues,
  type WeeklyScheduleFormValues,
} from '../working-hours';
import { CopyDayDialog } from './CopyDayDialog';

/** A new session starts an hour after the day's last one ends and lasts two hours. */
const SUGGESTED_GAP_MINUTES = 60;
const SUGGESTED_SESSION_MINUTES = 120;

const DIRTY = { shouldDirty: true } as const;

interface WorkingHoursCardProps {
  userId: string;
  /** Only owners can change working hours. */
  canEdit: boolean;
}

export function WorkingHoursCard({ userId, canEdit }: WorkingHoursCardProps) {
  const workingHoursQuery = useWorkingHours(userId);

  return (
    <Card>
      <CardHeader
        title="Working hours"
        description="When this person can be booked each week. Add a second session for a split day; the gap is a break."
      />
      {workingHoursQuery.isPending && <LoadingBlock label="Loading working hours" />}
      {workingHoursQuery.isError && (
        <ErrorBlock
          error={workingHoursQuery.error}
          onRetry={() => void workingHoursQuery.refetch()}
          isRetrying={workingHoursQuery.isFetching}
        />
      )}
      {workingHoursQuery.isSuccess && (
        <WorkingHoursForm userId={userId} intervals={workingHoursQuery.data} canEdit={canEdit} />
      )}
    </Card>
  );
}

interface WorkingHoursFormProps {
  userId: string;
  intervals: WorkingHoursInterval[];
  canEdit: boolean;
}

function WorkingHoursForm({ userId, intervals, canEdit }: WorkingHoursFormProps) {
  const toast = useToast();
  const saveMutation = useSetWorkingHours(userId);
  /** Index (display order) of the day being copied with the picker, or null. */
  const [copySourceIndex, setCopySourceIndex] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty, submitCount },
  } = useForm<WeeklyScheduleFormValues>({
    resolver: zodResolver(weeklyScheduleSchema),
    defaultValues: toWeeklyScheduleFormValues(intervals),
  });
  const days = useWatch({ control, name: 'days' });
  const week = summarizeWeek(days);

  /** Replaces the target days with the source day (sessions or day off). */
  const copyDay = (sourceIndex: number, targetIndexes: readonly number[]) => {
    const source = getValues(`days.${sourceIndex}`);
    for (const targetIndex of targetIndexes) {
      if (targetIndex === sourceIndex) continue;
      setValue(`days.${targetIndex}.is_working`, source.is_working, DIRTY);
      setValue(
        `days.${targetIndex}.sessions`,
        source.sessions.map((session) => ({ ...session })),
        DIRTY,
      );
    }
  };

  const fillWeek = (values: WeeklyScheduleFormValues) => {
    values.days.forEach((day, index) => {
      setValue(`days.${index}.is_working`, day.is_working, DIRTY);
      setValue(`days.${index}.sessions`, day.sessions, DIRTY);
    });
  };

  const templateItems: ActionMenuItem[] = [
    ...SCHEDULE_TEMPLATES.map((template) => ({
      label: template.label,
      description: template.description,
      onSelect: () => fillWeek(applyTemplate(template)),
    })),
    {
      label: 'Clear the week',
      description: 'No regular working hours',
      danger: true,
      onSelect: () =>
        days.forEach((_, index) => setValue(`days.${index}.is_working`, false, DIRTY)),
    },
  ];

  const onSubmit = handleSubmit((values) =>
    saveMutation.mutate(
      { intervals: toWorkingHoursIntervals(values) },
      {
        onSuccess: () => {
          // Show sessions in time order from now on, the way they were saved.
          reset(withSortedSessions(values));
          toast.success('Working hours saved');
        },
      },
    ),
  );

  const hasErrors = submitCount > 0 && Boolean(errors.days);

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <p className="text-sm text-slate-600">
          {week.workingDays === 0 ? (
            'No working hours yet'
          ) : (
            <>
              <span className="font-semibold text-slate-900">{formatDuration(week.minutes)}</span> a
              week · {week.workingDays} working {week.workingDays === 1 ? 'day' : 'days'}
            </>
          )}
        </p>
        {canEdit ? (
          <ActionMenu label="Quick fill" showLabel items={templateItems} />
        ) : (
          <p className="text-xs text-slate-500">Only owners can change working hours</p>
        )}
      </div>

      <div className="px-5">
        {(saveMutation.error || hasErrors) && (
          <div className="pt-4">
            {saveMutation.error ? (
              <ErrorAlert error={saveMutation.error} />
            ) : (
              <p role="alert" className="text-sm font-medium text-red-600">
                Some times need fixing. They’re highlighted below.
              </p>
            )}
          </div>
        )}

        <fieldset disabled={!canEdit} className="divide-y divide-slate-100">
          <legend className="sr-only">Weekly schedule</legend>
          {DAYS_IN_DISPLAY_ORDER.map((dayOfWeek, index) => (
            <DayRow
              key={dayOfWeek}
              index={index}
              dayName={DAY_NAMES[dayOfWeek]!}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors.days?.[index]}
              canEdit={canEdit}
              onCopyToWeekdays={() => copyDay(index, WEEKDAY_INDEXES)}
              onCopyTo={() => setCopySourceIndex(index)}
            />
          ))}
        </fieldset>
      </div>

      <div className="px-4 pb-4">
        <SaveBar
          visible={canEdit && isDirty}
          isSaving={saveMutation.isPending}
          onDiscard={() => reset(toWeeklyScheduleFormValues(intervals))}
          saveLabel="Save hours"
        />
      </div>

      {canEdit && (
        <CopyDayDialog
          sourceIndex={copySourceIndex}
          days={copySourceIndex === null ? [] : getValues('days')}
          onCopy={(sourceIndex, targetIndexes) => {
            copyDay(sourceIndex, targetIndexes);
            setCopySourceIndex(null);
          }}
          onClose={() => setCopySourceIndex(null)}
        />
      )}
    </form>
  );
}

interface DayRowProps {
  /** Position in the form's days array (display order). */
  index: number;
  dayName: string;
  control: Control<WeeklyScheduleFormValues>;
  register: UseFormRegister<WeeklyScheduleFormValues>;
  setValue: UseFormSetValue<WeeklyScheduleFormValues>;
  errors: FieldErrors<DayFormValues> | undefined;
  canEdit: boolean;
  onCopyToWeekdays: () => void;
  onCopyTo: () => void;
}

/** One day: an on/off switch, its sessions as compact time pills, its total and a ⋯ menu. */
function DayRow({
  index,
  dayName,
  control,
  register,
  setValue,
  errors,
  canEdit,
  onCopyToWeekdays,
  onCopyTo,
}: DayRowProps) {
  const isWorking = useWatch({ control, name: `days.${index}.is_working` });
  const sessions = useWatch({ control, name: `days.${index}.sessions` });
  const sessionFields = useFieldArray({ control, name: `days.${index}.sessions` });
  const { workingMinutes, breaks } = summarizeDay(sessions);

  const setWorking = (working: boolean) => {
    setValue(`days.${index}.is_working`, working, DIRTY);
    // Switching on a day whose sessions were all removed starts it with the default hours.
    if (working && sessionFields.fields.length === 0) sessionFields.append(defaultSession());
  };

  const removeSession = (sessionIndex: number) => {
    // A working day needs at least one session; removing the last one makes it a day off.
    if (sessionFields.fields.length === 1) setWorking(false);
    else sessionFields.remove(sessionIndex);
  };

  const sessionErrors = sessionFields.fields
    .map((_, sessionIndex) => {
      const sessionError = errors?.sessions?.[sessionIndex];
      return sessionError?.start_time?.message ?? sessionError?.end_time?.message;
    })
    .filter((message): message is string => Boolean(message));

  const menuItems: ActionMenuItem[] = [
    { label: 'Copy to Mon–Fri', onSelect: onCopyToWeekdays },
    { label: 'Copy to other days…', onSelect: onCopyTo },
    ...(isWorking ? [{ label: 'Set as day off', onSelect: () => setWorking(false) }] : []),
  ];

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="flex w-36 shrink-0 items-center gap-3 sm:pt-1">
        <Switch
          checked={isWorking}
          onChange={setWorking}
          label={`${dayName} is a working day`}
          disabled={!canEdit}
        />
        <span
          className={cn('text-sm font-medium', isWorking ? 'text-slate-900' : 'text-slate-500')}
        >
          {dayName}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        {isWorking ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {sessionFields.fields.map((field, sessionIndex) => {
                const sessionError = errors?.sessions?.[sessionIndex];
                return (
                  <SessionPill
                    key={field.id}
                    label={`${dayName} session ${sessionIndex + 1}`}
                    startProps={register(`days.${index}.sessions.${sessionIndex}.start_time`)}
                    endProps={register(`days.${index}.sessions.${sessionIndex}.end_time`)}
                    hasError={Boolean(sessionError)}
                    onRemove={canEdit ? () => removeSession(sessionIndex) : undefined}
                  />
                );
              })}
              {canEdit && sessionFields.fields.length < MAX_SESSIONS_PER_DAY && (
                <button
                  type="button"
                  onClick={() => sessionFields.append(suggestNextSession(sessions))}
                  aria-label={`Add a session on ${dayName}`}
                  title="Add a session"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-500 transition-colors hover:border-brand-500 hover:text-brand-700"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="M10 4a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 10 4Z" />
                  </svg>
                </button>
              )}
            </div>

            {sessionErrors.map((message) => (
              <p key={message} role="alert" className="text-xs font-medium text-red-600">
                {message}
              </p>
            ))}
            {breaks.length > 0 && (
              <p className="text-xs text-slate-500">
                {breaks
                  .map(
                    (dayBreak) =>
                      `Break ${formatTimeOfDay(dayBreak.start_time)} – ${formatTimeOfDay(dayBreak.end_time)}`,
                  )
                  .join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 sm:pt-1.5">Closed</p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:pt-0.5">
        {isWorking && workingMinutes > 0 && (
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {formatDuration(workingMinutes)}
          </span>
        )}
        {canEdit && <ActionMenu label={`More options for ${dayName}`} items={menuItems} />}
      </div>
    </div>
  );
}

interface SessionPillProps {
  /** For the inputs' accessible names, e.g. "Monday session 1 starts". */
  label: string;
  startProps: ReturnType<UseFormRegister<WeeklyScheduleFormValues>>;
  endProps: ReturnType<UseFormRegister<WeeklyScheduleFormValues>>;
  hasError: boolean;
  /** Omitted when read-only. */
  onRemove?: () => void;
}

/** A session as one compact "start – end ×" control. */
function SessionPill({ label, startProps, endProps, hasError, onRemove }: SessionPillProps) {
  const timeInput =
    'w-[6.75rem] border-0 bg-transparent p-0 text-sm text-slate-900 focus:outline-none disabled:text-slate-500';
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white pr-1 pl-3 shadow-sm',
        'focus-within:ring-2 focus-within:ring-brand-500/40',
        hasError ? 'border-red-400' : 'border-slate-200',
      )}
    >
      {/* step=300: the browser's picker moves in 5-minute steps; any minute can still be typed. */}
      <input
        type="time"
        step={300}
        aria-label={`${label} starts`}
        aria-invalid={hasError || undefined}
        className={timeInput}
        {...startProps}
      />
      <span className="text-slate-400" aria-hidden="true">
        –
      </span>
      <input
        type="time"
        step={300}
        aria-label={`${label} ends`}
        aria-invalid={hasError || undefined}
        className={timeInput}
        {...endProps}
      />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      ) : (
        <span className="w-1" />
      )}
    </div>
  );
}

/**
 * A new session placed after the day's latest one (an hour's gap, two hours long), clamped to
 * the end of the day. The user adjusts it; validation catches anything that doesn't fit.
 */
function suggestNextSession(sessions: SessionFormValues[]): SessionFormValues {
  const latestEnd = sessions.reduce(
    (latest, session) => (session.end_time > latest ? session.end_time : latest),
    '00:00',
  );
  const start = Math.min(toMinutes(latestEnd) + SUGGESTED_GAP_MINUTES, 22 * 60);
  const end = Math.min(start + SUGGESTED_SESSION_MINUTES, 23 * 60 + 59);
  return { start_time: fromMinutes(start), end_time: fromMinutes(end) };
}

/** "09:30" → 570 (invalid input counts as midnight; validation reports it separately). */
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours! * 60 + minutes! : 0;
}

/** 570 → "09:30" */
function fromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
