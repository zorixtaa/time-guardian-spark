import { useState, useEffect } from 'react';
import { getDailyBreakEntitlements, checkBreakEligibility } from '@/lib/attendanceActions';
import type { BreakEntitlements, BreakEligibility, BreakType } from '@/types/attendance';

export const useBreakEntitlements = (userId: string | null, attendanceId: string | null) => {
  const [entitlements, setEntitlements] = useState<BreakEntitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDailyBreakEntitlements(userId);
      setEntitlements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async (breakType: BreakType): Promise<BreakEligibility | null> => {
    if (!userId || !attendanceId) return null;
    
    try {
      return await checkBreakEligibility(userId, attendanceId, breakType);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, [userId]);

  return {
    entitlements,
    loading,
    error,
    fetchEntitlements,
    checkEligibility
  };
};