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
    className: 'bg-muted text-muted-foreground',
  },
  checked_in: {
    label: 'Checked In',
    icon: CheckCircle2,
    className: 'bg-success-light text-success border-success',
  },
  on_break: {
    label: 'On Break',
    icon: Coffee,
    className: 'bg-warning-light text-warning border-warning',
  },
  on_lunch: {
    label: 'On Lunch',
    icon: Utensils,
    className: 'bg-warning-light text-warning border-warning',
  },
  checked_out: {
    label: 'Checked Out',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
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
