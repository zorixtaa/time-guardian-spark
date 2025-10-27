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

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Check In */}
      <Button
        onClick={onCheckIn}
        disabled={!canCheckIn || loading}
        size="lg"
        className="h-20 flex flex-col gap-2"
      >
        <LogIn className="w-6 h-6" />
        <span>Check In</span>
      </Button>

      {/* Break */}
      <Button
        onClick={canStartBreak ? onStartBreak : onEndBreak}
        disabled={(!canStartBreak && !canEndBreak) || loading}
        size="lg"
        variant={canEndBreak ? 'destructive' : 'secondary'}
        className="h-20 flex flex-col gap-2"
      >
        {canEndBreak ? <Pause className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
        <span>{canEndBreak ? 'End Break' : 'Start Break'}</span>
      </Button>

      {/* Lunch */}
      <Button
        onClick={canStartLunch ? onStartLunch : onEndLunch}
        disabled={(!canStartLunch && !canEndLunch) || loading}
        size="lg"
        variant={canEndLunch ? 'destructive' : 'secondary'}
        className="h-20 flex flex-col gap-2"
      >
        {canEndLunch ? <Pause className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
        <span>{canEndLunch ? 'End Lunch' : 'Lunch Break'}</span>
      </Button>

      {/* Check Out */}
      <Button
        onClick={onCheckOut}
        disabled={!canCheckOut || loading}
        size="lg"
        variant="outline"
        className="h-20 flex flex-col gap-2"
      >
        <LogOut className="w-6 h-6" />
        <span>Check Out</span>
      </Button>
    </div>
  );
};
