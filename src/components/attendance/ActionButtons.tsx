import { Button } from '@/components/ui/button';
import { AttendanceState } from '@/types/attendance';
import { LogIn, LogOut, Coffee, Utensils, Pause, Square } from 'lucide-react';

interface ActionButtonsProps {
  state: AttendanceState;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onStartLunch: () => void;
  onEndLunch: () => void;
  loading?: boolean;
}

export const ActionButtons = ({
  state,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  onEndBreak,
  onStartLunch,
  onEndLunch,
  loading = false,
}: ActionButtonsProps) => {
  const canCheckIn = state === 'not_checked_in' || state === 'checked_out';
  const canCheckOut = state === 'checked_in';
  const canStartBreak = state === 'checked_in';
  const canEndBreak = state === 'on_break';
  const canStartLunch = state === 'checked_in';
  const canEndLunch = state === 'on_lunch';

  const actions = [
    {
      key: 'check-in',
      label: 'Check In',
      icon: LogIn,
      onClick: onCheckIn,
      disabled: !canCheckIn || loading,
      emphasis: canCheckIn && !loading,
    },
    {
      key: 'start-break',
      label: 'Start Break',
      icon: Coffee,
      onClick: onStartBreak,
      disabled: !canStartBreak || loading,
      emphasis: canStartBreak && !loading,
    },
    {
      key: 'end-break',
      label: 'End Break',
      icon: Pause,
      onClick: onEndBreak,
      disabled: !canEndBreak || loading,
      emphasis: canEndBreak && !loading,
    },
    {
      key: 'start-lunch',
      label: 'Start Lunch',
      icon: Utensils,
      onClick: onStartLunch,
      disabled: !canStartLunch || loading,
      emphasis: canStartLunch && !loading,
    },
    {
      key: 'end-lunch',
      label: 'End Lunch',
      icon: Square,
      onClick: onEndLunch,
      disabled: !canEndLunch || loading,
      emphasis: canEndLunch && !loading,
    },
    {
      key: 'check-out',
      label: 'Check Out',
      icon: LogOut,
      onClick: onCheckOut,
      disabled: !canCheckOut || loading,
      emphasis: canCheckOut && !loading,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map(({ key, label, icon: Icon, onClick, disabled, emphasis }) => (
        <Button
          key={key}
          type="button"
          onClick={onClick}
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
