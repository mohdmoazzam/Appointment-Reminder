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
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { controlStyles } from '@/components/ui/field-styles';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
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
  sessionMinutes,
  summarizeDay,
  toWeeklyScheduleFormValues,
  toWorkingHoursIntervals,
  withSortedSessions,
  type DayFormValues,
  type SessionFormValues,
  type WeeklyScheduleFormValues,
} from '../working-hours';
import { CopyDayDialog } from './CopyDayDialog';

/** Minutes between suggested sessions, e.g. a new session starts an hour after the last ends. */
const SUGGESTED_GAP_MINUTES = 60;
const SUGGESTED_SESSION_MINUTES = 120;

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
        description="When this person can be booked each week, in the business's time zone. Add several sessions for a split day, e.g. 10:00 – 14:00 and 16:00 – 18:00; the time between them is a break."
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
  /** Index (in display order) of the day being copied, or null when the dialog is closed. */
  const [copySourceIndex, setCopySourceIndex] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<WeeklyScheduleFormValues>({
    resolver: zodResolver(weeklyScheduleSchema),
    defaultValues: toWeeklyScheduleFormValues(intervals),
  });

  const copyDay = (sourceIndex: number, targetIndexes: number[]) => {
    const source = getValues(`days.${sourceIndex}`);
    const options = { shouldDirty: true, shouldValidate: false };
    for (const targetIndex of targetIndexes) {
      setValue(`days.${targetIndex}.is_working`, source.is_working, options);
      setValue(
        `days.${targetIndex}.sessions`,
        source.sessions.map((session) => ({ ...session })),
        options,
      );
    }
    setCopySourceIndex(null);
  };

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

  return (
    <form onSubmit={onSubmit} noValidate>
      <CardBody className="space-y-4">
        {!canEdit && <Alert tone="info">Only owners can change working hours.</Alert>}
        <ErrorAlert error={saveMutation.error} />

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
              onCopy={() => setCopySourceIndex(index)}
            />
          ))}
        </fieldset>
      </CardBody>

      {canEdit && (
        <CardFooter>
          <Button
            variant="secondary"
            disabled={!isDirty || saveMutation.isPending}
            onClick={() => reset(toWeeklyScheduleFormValues(intervals))}
          >
            Discard changes
          </Button>
          <Button type="submit" disabled={!isDirty} isLoading={saveMutation.isPending}>
            Save hours
          </Button>
        </CardFooter>
      )}

      {canEdit && (
        <CopyDayDialog
          sourceIndex={copySourceIndex}
          days={copySourceIndex === null ? [] : getValues('days')}
          onCopy={copyDay}
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
  onCopy: () => void;
}

/** One day: a "working" switch, its sessions, and a summary of hours and breaks. */
function DayRow({
  index,
  dayName,
  control,
  register,
  setValue,
  errors,
  canEdit,
  onCopy,
}: DayRowProps) {
  const isWorking = useWatch({ control, name: `days.${index}.is_working` });
  const sessions = useWatch({ control, name: `days.${index}.sessions` });
  const sessionFields = useFieldArray({ control, name: `days.${index}.sessions` });

  const addSession = () => sessionFields.append(suggestNextSession(sessions));

  const removeSession = (sessionIndex: number) => {
    if (sessionFields.fields.length === 1) {
      // A working day needs at least one session; removing the last one makes it a day off.
      setValue(`days.${index}.is_working`, false, { shouldDirty: true });
      return;
    }
    sessionFields.remove(sessionIndex);
  };

  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
      <label className="flex items-center gap-3 self-start pt-2 text-sm font-medium text-slate-900">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300 accent-brand-600"
          {...register(`days.${index}.is_working`)}
        />
        {dayName}
      </label>

      {isWorking ? (
        <div className="space-y-3">
          {sessionFields.fields.map((field, sessionIndex) => (
            <SessionRow
              key={field.id}
              label={`${dayName} session ${sessionIndex + 1}`}
              session={sessions[sessionIndex]}
              startProps={register(`days.${index}.sessions.${sessionIndex}.start_time`)}
              endProps={register(`days.${index}.sessions.${sessionIndex}.end_time`)}
              error={
                errors?.sessions?.[sessionIndex]?.start_time?.message ??
                errors?.sessions?.[sessionIndex]?.end_time?.message
              }
              onRemove={canEdit ? () => removeSession(sessionIndex) : undefined}
            />
          ))}

          <DaySummaryLine sessions={sessions} />

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {sessionFields.fields.length < MAX_SESSIONS_PER_DAY && (
                <Button variant="ghost" size="sm" onClick={addSession}>
                  + Add session
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onCopy}>
                Copy to other days…
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <p className="text-sm text-slate-500">Day off</p>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={onCopy}>
              Copy to other days…
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface SessionRowProps {
  /** Used for the inputs' accessible names, e.g. "Monday session 1 starts". */
  label: string;
  /** Current values, for the length shown next to the inputs. */
  session: SessionFormValues | undefined;
  startProps: ReturnType<UseFormRegister<WeeklyScheduleFormValues>>;
  endProps: ReturnType<UseFormRegister<WeeklyScheduleFormValues>>;
  error?: string;
  /** Omitted for read-only views. */
  onRemove?: () => void;
}

function SessionRow({ label, session, startProps, endProps, error, onRemove }: SessionRowProps) {
  const inputClasses = cn(controlStyles(Boolean(error)), 'w-32');
  const minutes = session && !error ? sessionMinutes(session) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {/* step=300: the browser's picker moves in 5-minute steps; any minute can still be typed. */}
        <input
          type="time"
          step={300}
          aria-label={`${label} starts`}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
          {...startProps}
        />
        <span className="text-sm text-slate-500">to</span>
        <input
          type="time"
          step={300}
          aria-label={`${label} ends`}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
          {...endProps}
        />
        {minutes > 0 && <span className="text-xs text-slate-500">{formatDuration(minutes)}</span>}
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${label}`}>
            Remove
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** "6 h · Break 2:00 PM – 4:00 PM", computed from the valid sessions as they are typed. */
function DaySummaryLine({ sessions }: { sessions: SessionFormValues[] }) {
  const { workingMinutes, breaks } = summarizeDay(sessions);
  if (workingMinutes === 0) return null;

  return (
    <p className="text-xs text-slate-500">
      <span className="font-medium text-slate-700">{formatDuration(workingMinutes)}</span>
      {breaks.map((dayBreak) => (
        <span key={`${dayBreak.start_time}-${dayBreak.end_time}`}>
          {' · '}Break {formatTimeOfDay(dayBreak.start_time)} – {formatTimeOfDay(dayBreak.end_time)}
        </span>
      ))}
    </p>
  );
}

/**
 * A new session placed after the latest one (an hour's gap, two hours long), clamped to the
 * end of the day. The user adjusts it; validation catches anything that doesn't fit.
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
