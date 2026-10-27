import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckboxList } from '@/components/ui/CheckboxList';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { formatTimeOfDay } from '@/lib/date';
import { DAY_NAMES, sortSessions, type DayFormValues } from '../working-hours';

interface CopyDayDialogProps {
  /** Index (in display order) of the day to copy from; null keeps the dialog closed. */
  sourceIndex: number | null;
  /** All seven days, in display order, as currently entered. */
  days: DayFormValues[];
  onCopy: (sourceIndex: number, targetIndexes: number[]) => void;
  onClose: () => void;
}

/** Copies one day's sessions (or its day off) to the days picked in the dialog. */
export function CopyDayDialog({ sourceIndex, days, onCopy, onClose }: CopyDayDialogProps) {
  const source = sourceIndex === null ? undefined : days[sourceIndex];

  return (
    <Dialog
      open={sourceIndex !== null}
      onClose={onClose}
      title={source ? `Copy ${DAY_NAMES[source.day_of_week]}` : 'Copy day'}
      description="The chosen days get exactly the same sessions. Their current hours are replaced."
    >
      {/* Mounted only while open, so the selection starts fresh each time. */}
      {source && sourceIndex !== null && (
        <CopyDayForm
          source={source}
          sourceIndex={sourceIndex}
          days={days}
          onCopy={onCopy}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

interface CopyDayFormProps {
  source: DayFormValues;
  sourceIndex: number;
  days: DayFormValues[];
  onCopy: CopyDayDialogProps['onCopy'];
  onClose: () => void;
}

function CopyDayForm({ source, sourceIndex, days, onCopy, onClose }: CopyDayFormProps) {
  const targets = days
    .map((day, index) => ({ day, index }))
    .filter(({ index }) => index !== sourceIndex);

  // Start with the other working days ticked: the usual intent is "make them all the same".
  const [selected, setSelected] = useState<string[]>(
    targets.filter(({ day }) => day.is_working).map(({ index }) => String(index)),
  );

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {source.is_working
          ? sortSessions(source.sessions)
              .map(
                (session) =>
                  `${formatTimeOfDay(session.start_time)} – ${formatTimeOfDay(session.end_time)}`,
              )
              .join(', ')
          : 'Day off'}
      </p>

      <CheckboxList
        legend="Copy to"
        options={targets.map(({ day, index }) => ({
          value: String(index),
          label: DAY_NAMES[day.day_of_week]!,
        }))}
        value={selected}
        onChange={setSelected}
      />

      <DialogActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={selected.length === 0}
          onClick={() => onCopy(sourceIndex, selected.map(Number))}
        >
          Copy to {selected.length} {selected.length === 1 ? 'day' : 'days'}
        </Button>
      </DialogActions>
    </div>
  );
}
