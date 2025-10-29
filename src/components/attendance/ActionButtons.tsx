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
          <div className="mb-2 text-xs uppercase tracking-wide text-yellow/60">Request Breaks</div>
          
          {/* Work duration indicator */}
          {workDurationMinutes < 60 && (
            <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
              <div className="flex items-center gap-2 text-yellow-500">
                <Timer className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Work for {minutesUntilEligible} more minutes to request breaks
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-3 grid-cols-3">
            {/* Coffee Break */}
            <Button
              type="button"
              onClick={onRequestCoffee}
              disabled={loading || !canRequestCoffee || isCoffeePending}
              aria-disabled={loading || !canRequestCoffee || isCoffeePending}
              aria-busy={loading}
              className={cn(
                'flex h-auto min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-xl border transition-all',
                isCoffeeActive
                  ? 'border-orange-500/80 bg-orange-500/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:bg-orange-500/30'
                  : isCoffeePending
                  ? 'border-yellow-500/80 bg-yellow-500/20 text-yellow-400'
                  : canRequestCoffee
                  ? 'border-yellow/20 bg-black/30 text-yellow/70 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300'
                  : 'border-gray-500/20 bg-gray-500/10 text-gray-500',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all',
                  isCoffeeActive
                    ? 'border-orange-500/80 bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                    : isCoffeePending
                    ? 'border-yellow-500/80 bg-yellow-500 text-black'
                    : canRequestCoffee
                    ? 'border-yellow/30 bg-yellow/15 text-yellow'
                    : 'border-gray-500/30 bg-gray-500/15 text-gray-500'
                )}
              >
                {isCoffeePending ? <Clock className="h-7 w-7" /> : <Coffee className="h-7 w-7" />}
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold">COFFEE</div>
                <div className="text-xs opacity-70">
                  {isCoffeeActive ? 'On Break' : isCoffeePending ? 'Pending Approval' : canRequestCoffee ? 'Request Break' : 'Not Available'}
                </div>
                {entitlements && (
                  <div className="text-xs text-yellow-500/60 mt-1">
                    {entitlements.micro_break_remaining}min left
                  </div>
                )}
              </div>
            </Button>

            {/* WC Break */}
            <Button
              type="button"
              onClick={onRequestWc}
              disabled={loading || !canRequestWc || isWcPending}
              aria-disabled={loading || !canRequestWc || isWcPending}
              aria-busy={loading}
              className={cn(
                'flex h-auto min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-xl border transition-all',
                isWcActive
                  ? 'border-blue-500/80 bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:bg-blue-500/30'
                  : isWcPending
                  ? 'border-yellow-500/80 bg-yellow-500/20 text-yellow-400'
                  : canRequestWc
                  ? 'border-yellow/20 bg-black/30 text-yellow/70 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300'
                  : 'border-gray-500/20 bg-gray-500/10 text-gray-500',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all',
                  isWcActive
                    ? 'border-blue-500/80 bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                    : isWcPending
                    ? 'border-yellow-500/80 bg-yellow-500 text-black'
                    : canRequestWc
                    ? 'border-yellow/30 bg-yellow/15 text-yellow'
                    : 'border-gray-500/30 bg-gray-500/15 text-gray-500'
                )}
              >
                {isWcPending ? <Clock className="h-7 w-7" /> : <CircleSlash2 className="h-7 w-7" />}
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold">WC</div>
                <div className="text-xs opacity-70">
                  {isWcActive ? 'On Break' : isWcPending ? 'Pending Approval' : canRequestWc ? 'Request Break' : 'Not Available'}
                </div>
                {entitlements && (
                  <div className="text-xs text-yellow-500/60 mt-1">
                    {entitlements.micro_break_remaining}min left
                  </div>
                )}
              </div>
            </Button>

            {/* Lunch Break */}
            <Button
              type="button"
              onClick={onRequestLunch}
              disabled={loading || !canRequestLunch || isLunchPending}
              aria-disabled={loading || !canRequestLunch || isLunchPending}
              aria-busy={loading}
              className={cn(
                'flex h-auto min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-xl border transition-all',
                isLunchActive
                  ? 'border-green-500/80 bg-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-green-500/30'
                  : isLunchPending
                  ? 'border-yellow-500/80 bg-yellow-500/20 text-yellow-400'
                  : canRequestLunch
                  ? 'border-yellow/20 bg-black/30 text-yellow/70 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-300'
                  : 'border-gray-500/20 bg-gray-500/10 text-gray-500',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border transition-all',
                  isLunchActive
                    ? 'border-green-500/80 bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                    : isLunchPending
                    ? 'border-yellow-500/80 bg-yellow-500 text-black'
                    : canRequestLunch
                    ? 'border-yellow/30 bg-yellow/15 text-yellow'
                    : 'border-gray-500/30 bg-gray-500/15 text-gray-500'
                )}
              >
                {isLunchPending ? <Clock className="h-7 w-7" /> : <UtensilsCrossed className="h-7 w-7" />}
              </span>
              <div className="text-center">
                <div className="text-sm font-semibold">LUNCH</div>
                <div className="text-xs opacity-70">
                  {isLunchActive ? 'On Break' : isLunchPending ? 'Pending Approval' : canRequestLunch ? 'Request Break' : 'Not Available'}
                </div>
                {entitlements && (
                  <div className="text-xs text-yellow-500/60 mt-1">
                    {entitlements.lunch_break_remaining}min left
                  </div>
                )}
              </div>
            </Button>
          </div>

          {/* Show pending break status */}
          {activeBreaks.length > 0 && currentBreak?.status === 'pending' && (
            <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">
                    {currentBreak.type.charAt(0).toUpperCase() + currentBreak.type.slice(1)} break requested
                  </p>
                  <p className="text-xs text-yellow-500/70">
                    Waiting for admin approval...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show approved break - ready to start */}
          {activeBreaks.length > 0 && currentBreak?.status === 'approved' && (
            <div className="mt-3 rounded-xl border-2 border-green-500/60 bg-gradient-to-br from-green-500/20 to-green-600/10 p-5 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-pulse">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-base font-semibold text-green-400">
                      {currentBreak.type.charAt(0).toUpperCase() + currentBreak.type.slice(1)} break approved!
                    </p>
                    <p className="text-xs text-green-400/80">
                      Your break has been approved by admin
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => onStartApprovedBreak(currentBreak.id)}
                  disabled={loading}
                  className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-bold text-base shadow-[0_0_25px_rgba(34,197,94,0.5)] hover:shadow-[0_0_35px_rgba(34,197,94,0.7)] transition-all"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Break Approved - Leave Position?
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
