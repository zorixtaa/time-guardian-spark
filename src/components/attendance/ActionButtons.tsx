import { Button } from '@/components/ui/button';
import { AttendanceState } from '@/types/attendance';
import { 
  LogIn, 
  LogOut, 
  Coffee, 
  Utensils,
  Play,
  Pause 
} from 'lucide-react';

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
  const canCheckIn = state === 'not_checked_in';
  const canCheckOut = state === 'checked_in';
  const canStartBreak = state === 'checked_in';
  const canEndBreak = state === 'on_break';
  const canStartLunch = state === 'checked_in';
  const canEndLunch = state === 'on_lunch';

  const baseButtonClass =
    'h-24 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-200';
  const glowClass =
    'shadow-[0_0_30px_rgba(234,179,8,0.25)] hover:shadow-[0_0_40px_rgba(234,179,8,0.35)] hover:-translate-y-1';

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Check In */}
      <Button
        onClick={onCheckIn}
        disabled={!canCheckIn || loading}
        size="lg"
        className={`${baseButtonClass} ${glowClass} bg-yellow text-yellow-foreground`}
      >
        <LogIn className="w-6 h-6" />
        <span>Check In</span>
      </Button>

      {/* Break */}
      <Button
        onClick={canStartBreak ? onStartBreak : onEndBreak}
        disabled={(!canStartBreak && !canEndBreak) || loading}
        size="lg"
        className={`${baseButtonClass} ${
          canEndBreak
            ? `${glowClass} bg-yellow text-yellow-foreground`
            : 'border border-yellow/30 bg-yellow/15 text-yellow hover:bg-yellow/25 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(234,179,8,0.2)]'
        }`}
      >
        {canEndBreak ? <Pause className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
        <span>{canEndBreak ? 'End Break' : 'Start Break'}</span>
      </Button>

      {/* Lunch */}
      <Button
        onClick={canStartLunch ? onStartLunch : onEndLunch}
        disabled={(!canStartLunch && !canEndLunch) || loading}
        size="lg"
        className={`${baseButtonClass} ${
          canEndLunch
            ? `${glowClass} bg-yellow text-yellow-foreground`
            : 'border border-yellow/30 bg-yellow/15 text-yellow hover:bg-yellow/25 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(234,179,8,0.2)]'
        }`}
      >
        {canEndLunch ? <Pause className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
        <span>{canEndLunch ? 'End Lunch' : 'Lunch Break'}</span>
      </Button>

      {/* Check Out */}
      <Button
        onClick={onCheckOut}
        disabled={!canCheckOut || loading}
        size="lg"
        className={`${baseButtonClass} border border-yellow/30 bg-yellow/15 text-yellow hover:bg-yellow/25 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(234,179,8,0.2)]`}
      >
        <LogOut className="w-6 h-6" />
        <span>Check Out</span>
      </Button>
    </div>
  );
};
