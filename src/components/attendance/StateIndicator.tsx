import { AttendanceState } from '@/types/attendance';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, Utensils, CheckCircle2, Circle } from 'lucide-react';

interface StateIndicatorProps {
  state: AttendanceState;
}

const stateConfig = {
  not_checked_in: {
    label: 'Not Checked In',
    icon: Circle,
    className: 'border border-yellow/20 bg-yellow/10 text-yellow',
  },
  checked_in: {
    label: 'Checked In',
    icon: CheckCircle2,
    className: 'bg-yellow text-yellow-foreground shadow-[0_0_20px_rgba(234,179,8,0.3)]',
  },
  on_break: {
    label: 'On Break',
    icon: Coffee,
    className: 'border border-yellow/20 bg-yellow/15 text-yellow',
  },
  on_lunch: {
    label: 'On Lunch',
    icon: Utensils,
    className: 'border border-yellow/20 bg-yellow/15 text-yellow',
  },
  checked_out: {
    label: 'Checked Out',
    icon: Clock,
    className: 'border border-yellow/10 bg-black/20 text-muted-foreground',
  },
};

export const StateIndicator = ({ state }: StateIndicatorProps) => {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} px-4 py-2 text-sm font-semibold`}>
      <Icon className="w-4 h-4 mr-2" />
      {config.label}
    </Badge>
  );
};
