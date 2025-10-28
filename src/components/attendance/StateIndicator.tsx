import type { ComponentType } from 'react';
import { AttendanceState } from '@/types/attendance';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, UtensilsCrossed, CheckCircle2, Circle, CircleSlash2 } from 'lucide-react';

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
  on_coffee_break: {
    label: 'On Coffee Break',
    icon: Coffee,
    className: 'border border-orange-500/40 bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]',
  },
  on_wc_break: {
    label: 'On WC Break',
    icon: CircleSlash2,
    className: 'border border-blue-500/40 bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  },
  on_lunch_break: {
    label: 'On Lunch Break',
    icon: UtensilsCrossed,
    className: 'border border-green-500/40 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.25)]',
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
