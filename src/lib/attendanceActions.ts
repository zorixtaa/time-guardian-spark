import { supabase } from '@/integrations/supabase/client';

export const checkIn = async (userId: string) => {
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: userId,
      clock_in_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const checkOut = async (attendanceId: string) => {
  const { data, error } = await supabase
    .from('attendance')
    .update({
      clock_out_at: new Date().toISOString(),
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const startBreak = async (userId: string, type: 'scheduled' | 'bathroom' = 'bathroom') => {
  const { data, error } = await supabase
    .from('breaks')
    .insert({
      user_id: userId,
      type,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const endBreak = async (breakId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', breakId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const startLunch = async (userId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .insert({
      user_id: userId,
      type: 'lunch',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const endLunch = async (breakId: string) => {
  return endBreak(breakId);
};
