import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import type { AttendanceState, BreakRecord } from '@/types/attendance';
import {
  LogIn,
  LogOut,
  Coffee,
  Utensils,
  Pause,
  Square,
  Hourglass,
  CircleOff,
} from 'lucide-react';

interface ActionButtonsProps {
  state: AttendanceState;
  breakRecord: BreakRecord | null;
  lunchRecord: BreakRecord | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onRequestBreak: () => void;
  onCancelBreakRequest: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onRequestLunch: () => void;
  onCancelLunchRequest: () => void;
  onStartLunch: () => void;
  onEndLunch: () => void;
  loading?: boolean;
}

interface ActionConfig {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled: boolean;
  emphasis?: boolean;
}

const hasOpenStatus = (record: BreakRecord | null) =>
  !!record && ['requested', 'approved', 'active'].includes(record.status);

export const ActionButtons = ({
  state,
  breakRecord,
  lunchRecord,
  onCheckIn,
  onCheckOut,
  onRequestBreak,
  onCancelBreakRequest,
  onStartBreak,
  onEndBreak,
  onRequestLunch,
  onCancelLunchRequest,
  onStartLunch,
  onEndLunch,
  loading = false,
}: ActionButtonsProps) => {
  const breakPending = breakRecord?.status === 'requested';
  const breakApproved = breakRecord?.status === 'approved';
  const breakActive = breakRecord?.status === 'active';

  const lunchPending = lunchRecord?.status === 'requested';
  const lunchApproved = lunchRecord?.status === 'approved';
  const lunchActive = lunchRecord?.status === 'active';

  const hasBreakInFlight = hasOpenStatus(breakRecord);
  const hasLunchInFlight = hasOpenStatus(lunchRecord);

  const canCheckIn = state === 'not_checked_in' || state === 'checked_out';
  const canCheckOut = state === 'checked_in' && !hasBreakInFlight && !hasLunchInFlight;
  const canRequestBreak = state === 'checked_in' && !hasBreakInFlight && !hasLunchInFlight;
  const canRequestLunch = state === 'checked_in' && !hasBreakInFlight && !hasLunchInFlight;

  const actions: ActionConfig[] = [
    {
      key: 'check-in',
      label: 'Check In',
      icon: LogIn,
      onClick: onCheckIn,
      disabled: !canCheckIn || loading,
      emphasis: canCheckIn && !loading,
    },
  ];

  if (!breakRecord) {
    actions.push({
      key: 'request-break',
      label: 'Request Break',
      icon: Coffee,
      onClick: onRequestBreak,
      disabled: !canRequestBreak || loading,
      emphasis: canRequestBreak && !loading,
    });
  } else if (breakPending) {
    actions.push({
      key: 'break-pending',
      label: 'Break Pending Approval',
      icon: Hourglass,
      disabled: true,
      emphasis: false,
    });
    actions.push({
      key: 'cancel-break',
      label: 'Cancel Break Request',
      icon: CircleOff,
      onClick: onCancelBreakRequest,
      disabled: loading,
      emphasis: false,
    });
  } else if (breakApproved) {
    actions.push({
      key: 'start-break',
      label: 'Start Break',
      icon: Coffee,
      onClick: onStartBreak,
      disabled: loading,
      emphasis: !loading,
    });
  } else if (breakActive) {
    actions.push({
      key: 'end-break',
      label: 'End Break',
      icon: Pause,
      onClick: onEndBreak,
      disabled: loading,
      emphasis: !loading,
    });
  }

  if (!lunchRecord) {
    actions.push({
      key: 'request-lunch',
      label: 'Request Lunch',
      icon: Utensils,
      onClick: onRequestLunch,
      disabled: !canRequestLunch || loading,
      emphasis: canRequestLunch && !loading,
    });
  } else if (lunchPending) {
    actions.push({
      key: 'lunch-pending',
      label: 'Lunch Pending Approval',
      icon: Hourglass,
      disabled: true,
      emphasis: false,
    });
    actions.push({
      key: 'cancel-lunch',
      label: 'Cancel Lunch Request',
      icon: CircleOff,
      onClick: onCancelLunchRequest,
      disabled: loading,
      emphasis: false,
    });
  } else if (lunchApproved) {
    actions.push({
      key: 'start-lunch',
      label: 'Start Lunch',
      icon: Utensils,
      onClick: onStartLunch,
      disabled: loading,
      emphasis: !loading,
    });
  } else if (lunchActive) {
    actions.push({
      key: 'end-lunch',
      label: 'End Lunch',
      icon: Square,
      onClick: onEndLunch,
      disabled: loading,
      emphasis: !loading,
    });
  }

  actions.push({
    key: 'check-out',
    label: 'Check Out',
    icon: LogOut,
    onClick: onCheckOut,
    disabled: !canCheckOut || loading,
    emphasis: canCheckOut && !loading,
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map(({ key, label, icon: Icon, onClick, disabled, emphasis }) => (
        <Button
          key={key}
          type="button"
          onClick={onClick ? () => onClick() : undefined}
          disabled={disabled}
          aria-disabled={disabled}
          aria-busy={loading}
          className={
            'flex h-auto min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-yellow/25 bg-black/40 text-sm font-semibold text-yellow transition-colors hover:bg-yellow/20 hover:text-yellow-foreground focus-visible:ring-yellow/60 disabled:cursor-not-allowed disabled:border-yellow/10 disabled:bg-black/20 disabled:text-yellow/40'
          }
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-yellow/30 bg-yellow/20 text-yellow ${
              emphasis ? 'border-yellow/80 bg-yellow text-black shadow-[0_0_18px_rgba(234,179,8,0.45)]' : ''
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
};
