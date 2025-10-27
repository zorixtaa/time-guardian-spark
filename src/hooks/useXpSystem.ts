import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GamificationSetting {
  setting_key: string;
  setting_value: Record<string, unknown>;
}

interface XpState {
  xpEnabled: boolean;
  loading: boolean;
  totalXp: number;
  level: number;
  currentLevelFloor: number;
  nextLevelXp: number;
  progressPercentage: number;
  xpToNextLevel: number;
  refresh: () => Promise<void>;
  error?: string;
}

const DEFAULT_STATE: Omit<XpState, 'refresh'> = {
  xpEnabled: false,
  loading: false,
  totalXp: 0,
  level: 1,
  currentLevelFloor: 0,
  nextLevelXp: 100,
  progressPercentage: 0,
  xpToNextLevel: 100,
  error: undefined,
};

const XP_FALLBACK_PER_LEVEL = 100;

export const useXpSystem = (userId?: string): XpState => {
  const [state, setState] = useState<Omit<XpState, 'refresh'>>({ ...DEFAULT_STATE });

  const computeLevel = useCallback((totalXp: number, xpPerLevel: number) => {
    if (xpPerLevel <= 0) {
      return {
        level: 1,
        currentLevelFloor: 0,
        nextLevelXp: XP_FALLBACK_PER_LEVEL,
        progressPercentage: 0,
        xpToNextLevel: XP_FALLBACK_PER_LEVEL,
      };
    }

    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const currentLevelFloor = (level - 1) * xpPerLevel;
    const nextLevelXp = level * xpPerLevel;
    const xpIntoCurrentLevel = totalXp - currentLevelFloor;
    const xpForNextLevel = nextLevelXp - currentLevelFloor || xpPerLevel;
    const progressPercentage = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpForNextLevel) * 100));
    const xpToNextLevel = Math.max(0, nextLevelXp - totalXp);

    return {
      level,
      currentLevelFloor,
      nextLevelXp,
      progressPercentage,
      xpToNextLevel,
    };
  }, []);

  const fetchXp = useCallback(async () => {
    if (!userId) {
      setState({ ...DEFAULT_STATE });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const [settingsRes, ledgerRes] = await Promise.all([
        supabase.from('gamification_settings').select('setting_key, setting_value'),
        supabase.from('xp_ledger').select('points').eq('user_id', userId),
      ]);

      const relationMissing =
        settingsRes.error?.code === '42P01' || ledgerRes.error?.code === '42P01';

      if (relationMissing) {
        setState({ ...DEFAULT_STATE, loading: false, error: undefined });
        return;
      }

      if (settingsRes.error) throw settingsRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      const settings = (settingsRes.data ?? []) as GamificationSetting[];
      const xpSettings = settings.find((setting) => setting.setting_key === 'xp_rewards');
      const xpEnabled = Boolean(xpSettings);

      if (!xpEnabled) {
        setState({ ...DEFAULT_STATE, loading: false, error: undefined });
        return;
      }

      const xpRewardValues = Object.values(xpSettings.setting_value ?? {})
        .map((value) => (typeof value === 'number' ? value : Number(value)))
        .filter((value) => Number.isFinite(value) && value > 0);

      const xpPerLevel = xpRewardValues.length
        ? Math.max(XP_FALLBACK_PER_LEVEL, Math.max(...xpRewardValues) * 4)
        : XP_FALLBACK_PER_LEVEL;

      const entries = (ledgerRes.data ?? []) as { points: number }[];
      const totalXp = entries.reduce((sum, entry) => sum + (entry.points ?? 0), 0);

      const { level, currentLevelFloor, nextLevelXp, progressPercentage, xpToNextLevel } = computeLevel(
        totalXp,
        xpPerLevel,
      );

      setState({
        xpEnabled,
        loading: false,
        totalXp,
        level,
        currentLevelFloor,
        nextLevelXp,
        progressPercentage,
        xpToNextLevel,
        error: undefined,
      });
    } catch (error: any) {
      console.error('Failed to load XP system', error);
      setState({
        ...DEFAULT_STATE,
        loading: false,
        error: error?.message ?? 'Unable to load XP data',
      });
    }
  }, [userId, computeLevel]);

  useEffect(() => {
    void fetchXp();
  }, [fetchXp]);

  const refresh = useCallback(async () => {
    await fetchXp();
  }, [fetchXp]);

  return useMemo(() => ({ ...state, refresh }), [state, refresh]);
};
