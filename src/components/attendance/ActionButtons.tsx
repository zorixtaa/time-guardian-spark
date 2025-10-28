import { Button } from '@/components/ui/button';
import type { AttendanceState, BreakRecord } from '@/types/attendance';
import { LogIn, LogOut, Coffee, UtensilsCrossed, CircleSlash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  state: AttendanceState;
  activeBreaks: BreakRecord[];
  onCheckIn: () => void;
  onCheckOut: () => void;
  onRequestCoffee: () => void;
  onRequestWc: () => void;
  onRequestLunch: () => void;
  loading?: boolean;
}

export const ActionButtons = ({
  state,
  activeBreaks,
  onCheckIn,
  onCheckOut,
  onRequestCoffee,
  onRequestWc,
  onRequestLunch,
  loading = false,
}: ActionButtonsProps) => {
  const canCheckIn = state === 'not_checked_in' || state === 'checked_out';
  const canCheckOut = state === 'checked_in' || state.includes('_break');
  const canRequestBreaks = state === 'checked_in' && activeBreaks.length === 0;

  // Check which breaks are currently active or pending
  const currentBreak = activeBreaks[0]; // Only one break at a time
  const isCoffeeActive = currentBreak?.type === 'coffee' && currentBreak?.status === 'active';
  const isWcActive = currentBreak?.type === 'wc' && currentBreak?.status === 'active';
  const isLunchActive = currentBreak?.type === 'lunch' && currentBreak?.status === 'active';
  const isCoffeePending = currentBreak?.type === 'coffee' && currentBreak?.status === 'pending';
  const isWcPending = currentBreak?.type === 'wc' && currentBreak?.status === 'pending';
  const isLunchPending = currentBreak?.type === 'lunch' && currentBreak?.status === 'pending';

  return (
    <div className="space-y-4">
      {/* Primary Actions: Check In / Check Out */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={onCheckIn}
          disabled={!canCheckIn || loading}
          aria-disabled={!canCheckIn || loading}
          aria-busy={loading}
          className={cn(
            'flex h-auto min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-yellow/25 bg-black/40 text-sm font-semibold text-yellow transition-colors hover:bg-yellow/20 hover:text-yellow-foreground focus-visible:ring-yellow/60 disabled:cursor-not-allowed disabled:border-yellow/10 disabled:bg-black/20 disabled:text-yellow/40',
            canCheckIn && !loading && 'border-yellow/80 bg-yellow/10 shadow-[0_0_18px_rgba(234,179,8,0.25)]'
          )}
        >
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border border-yellow/30 bg-yellow/20 text-yellow',
              canCheckIn && !loading && 'border-yellow/80 bg-yellow text-black shadow-[0_0_18px_rgba(234,179,8,0.45)]'
            )}
          >
            <LogIn className="h-5 w-5" />
          </span>
          <span>Check In</span>
        </Button>

        <Button
          type="button"
          onClick={onCheckOut}
          disabled={!canCheckOut || loading}
          aria-disabled={!canCheckOut || loading}
          aria-busy={loading}
          className={cn(
            'flex h-auto min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-yellow/25 bg-black/40 text-sm font-semibold text-yellow transition-colors hover:bg-yellow/20 hover:text-yellow-foreground focus-visible:ring-yellow/60 disabled:cursor-not-allowed disabled:border-yellow/10 disabled:bg-black/20 disabled:text-yellow/40',
            canCheckOut && !loading && 'border-yellow/80 bg-yellow/10 shadow-[0_0_18px_rgba(234,179,8,0.25)]'
          )}
        >
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border border-yellow/30 bg-yellow/20 text-yellow',
              canCheckOut && !loading && 'border-yellow/80 bg-yellow text-black shadow-[0_0_18px_rgba(234,179,8,0.45)]'
            )}
          >
            <LogOut className="h-5 w-5" />
          </span>
          <span>Check Out</span>
        </Button>
      </div>

      {/* Break Pictograms - Only show when checked in */}
      {state === 'checked_in' && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-yellow/60">Quick Breaks</div>
          <div className="grid gap-3 grid-cols-3">
            {/* Coffee Break */}
            <Button
              type="button"
              onClick={onToggleCoffee}
              disabled={loading}
              aria-disabled={loading}
              aria-busy={loading}
              className={cn(
                'flex h-auto min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-xl border transition-all',
                isCoffeeActive
                  ? 'border-orange-500/80 bg-orange-500/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:bg-orange-500/30'
                  : 'border-yellow/20 bg-black/30 text-yellow/70 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all',
                  isCoffeeActive
                    ? 'border-orange-500/80 bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                    : 'border-yellow/30 bg-yellow/15 text-yellow'
                )}
              >
                <Coffee className="h-7 w-7" />
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold">COFFEE</div>
                <div className="text-xs opacity-70">{isCoffeeActive ? 'End Break' : 'Start Break'}</div>
              </div>
            </Button>

            {/* WC Break */}
            <Button
              type="button"
              onClick={onToggleWc}
              disabled={loading}
              aria-disabled={loading}
              aria-busy={loading}
              className={cn(
                'flex h-auto min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-xl border transition-all',
                isWcActive
                  ? 'border-blue-500/80 bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:bg-blue-500/30'
                  : 'border-yellow/20 bg-black/30 text-yellow/70 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all',
                  isWcActive
                    ? 'border-blue-500/80 bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                    : 'border-yellow/30 bg-yellow/15 text-yellow'
                )}
              >
                <CircleSlash2 className="h-7 w-7" />
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold">WC</div>
                <div className="text-xs opacity-70">{isWcActive ? 'End Break' : 'Start Break'}</div>
              </div>
            </Button>

            {/* Lunch Break */}
            <Button
              type="button"
              onClick={onToggleLunch}
              disabled={loading}
              aria-disabled={loading}
              aria-busy={loading}
              className={cn(
                'flex h-auto min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-xl border transition-all',
                isLunchActive
                  ? 'border-green-500/80 bg-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-green-500/30'
                  : 'border-yellow/20 bg-black/30 text-yellow/70 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-300',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all',
                  isLunchActive
                    ? 'border-green-500/80 bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                    : 'border-yellow/30 bg-yellow/15 text-yellow'
                )}
              >
                <UtensilsCrossed className="h-7 w-7" />
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold">LUNCH</div>
                <div className="text-xs opacity-70">{isLunchActive ? 'End Break' : 'Start Break'}</div>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
