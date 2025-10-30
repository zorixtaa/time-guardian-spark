import { Button } from '@/components/ui/button';
import type { AttendanceState, BreakRecord, BreakEntitlements } from '@/types/attendance';
import { LogIn, LogOut, Coffee, UtensilsCrossed, CircleSlash2, Clock, Timer, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  state: AttendanceState;
  activeBreaks: BreakRecord[];
  entitlements: BreakEntitlements | null;
  workDurationMinutes: number;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onRequestCoffee: () => void;
  onRequestWc: () => void;
  onRequestLunch: () => void;
  onStartApprovedBreak: (breakId: string) => void;
  loading?: boolean;
}

export const ActionButtons = ({
  state,
  activeBreaks,
  entitlements,
  workDurationMinutes,
  onCheckIn,
  onCheckOut,
  onRequestCoffee,
  onRequestWc,
  onRequestLunch,
  onStartApprovedBreak,
  loading = false,
}: ActionButtonsProps) => {
  const canCheckIn = state === 'not_checked_in' || state === 'checked_out';
  const canCheckOut = state === 'checked_in' || state.includes('_break');
  const canRequestBreaks = state === 'checked_in' && activeBreaks.length === 0;

  // Check which breaks are currently active, pending, or approved
  const currentBreak = activeBreaks[0]; // Only one break at a time
  const isCoffeeActive = currentBreak?.type === 'coffee' && currentBreak?.status === 'active';
  const isWcActive = currentBreak?.type === 'wc' && currentBreak?.status === 'active';
  const isLunchActive = currentBreak?.type === 'lunch' && currentBreak?.status === 'active';
  const isCoffeePending = currentBreak?.type === 'coffee' && currentBreak?.status === 'pending';
  const isWcPending = currentBreak?.type === 'wc' && currentBreak?.status === 'pending';
  const isLunchPending = currentBreak?.type === 'lunch' && currentBreak?.status === 'pending';
  const isCoffeeApproved = currentBreak?.type === 'coffee' && currentBreak?.status === 'approved';
  const isWcApproved = currentBreak?.type === 'wc' && currentBreak?.status === 'approved';
  const isLunchApproved = currentBreak?.type === 'lunch' && currentBreak?.status === 'approved';

  // Break eligibility checks
  const canRequestCoffee = canRequestBreaks && 
    workDurationMinutes >= 60 && 
    entitlements && 
    entitlements.micro_break_remaining > 0;
  
  const canRequestWc = canRequestBreaks && 
    workDurationMinutes >= 60 && 
    entitlements && 
    entitlements.micro_break_remaining > 0;
  
  const canRequestLunch = canRequestBreaks && 
    workDurationMinutes >= 60 && 
    entitlements && 
    entitlements.lunch_break_remaining > 0;

  // Get remaining time until break eligibility
  const minutesUntilEligible = Math.max(0, 60 - workDurationMinutes);

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
          <div className="mb-2 text-xs uppercase tracking-wide text-yellow/60">Break System</div>
          
          {/* Breaks Temporarily Disabled Notice */}
          <div className="rounded-xl border-2 border-yellow-500/40 bg-yellow-500/10 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-500/60 bg-yellow-500/20">
                <AlertCircle className="h-7 w-7 text-yellow-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-yellow-500">
                  Break System Temporarily Disabled
                </p>
                <p className="text-sm text-yellow-500/80 mt-1">
                  All break requests have been deactivated. System will be re-enabled after maintenance.
                </p>
                <p className="text-xs text-yellow-500/60 mt-2">
                  All attendance activities are being logged for audit purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
