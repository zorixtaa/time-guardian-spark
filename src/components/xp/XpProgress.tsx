import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface XpProgressProps {
  loading: boolean;
  level: number;
  totalXp: number;
  progressPercentage: number;
  xpToNextLevel: number;
  className?: string;
}

export const XpProgress = ({
  loading,
  level,
  totalXp,
  progressPercentage,
  xpToNextLevel,
  className,
}: XpProgressProps) => {
  if (loading) {
    return (
      <div className={cn('flex w-56 flex-col gap-2 text-right', className)}>
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-4 w-16 bg-yellow/20" />
          <Skeleton className="h-6 w-12 bg-yellow/30" />
        </div>
        <Skeleton className="h-2 w-full rounded-full bg-yellow/15" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-56 flex-col gap-2 rounded-xl border border-yellow/20 bg-black/40 p-3 text-right shadow-lg shadow-yellow/10 backdrop-blur',
        className,
      )}
    >
      <div className="flex items-center justify-end gap-2 text-yellow">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide text-yellow/80">XP Level</span>
        <span className="text-lg font-bold text-yellow">Lv. {level}</span>
      </div>
      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-yellow/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow via-yellow to-amber-400"
            style={{ width: `${Math.min(100, Math.max(0, progressPercentage)).toFixed(1)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-yellow/70">
          <span>{Math.round(totalXp)} XP</span>
          <span>{Math.max(0, Math.round(xpToNextLevel))} to next</span>
        </div>
      </div>
    </div>
  );
};
