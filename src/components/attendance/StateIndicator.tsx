import type { ComponentType } from 'react';
import { AttendanceState } from '@/types/attendance';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, Utensils, CheckCircle2, Circle, Hourglass } from 'lucide-react';

interface StateIndicatorProps {
  state: AttendanceState;
}

const stateConfig: Record<AttendanceState, { label: string; icon: ComponentType<{ className?: string }>; className: string }> = {
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
  break_requested: {
    label: 'Break Pending Approval',
    icon: Hourglass,
    className: 'border border-yellow/20 bg-yellow/10 text-yellow',
  },
  break_approved: {
    label: 'Break Approved',
    icon: Coffee,
    className: 'border border-yellow/20 bg-yellow/15 text-yellow',
  },
  on_break: {
    label: 'On Break',
    icon: Coffee,
    className: 'border border-yellow/20 bg-yellow/15 text-yellow',
  },
  lunch_requested: {
    label: 'Lunch Pending Approval',
    icon: Hourglass,
    className: 'border border-yellow/20 bg-yellow/10 text-yellow',
  },
  lunch_approved: {
    label: 'Lunch Approved',
    icon: Utensils,
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
