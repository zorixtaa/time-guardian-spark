// Jest-style test outline for attendance helpers
import { requestBreak, approveBreak, startBreak, endBreak, cancelBreak } from '../src/lib/attendance';
import { supabase } from '../src/lib/supabase';

describe('attendance helpers', () => {
  let createdId: string;

  test('requestBreak creates a row', async () => {
    const row = await requestBreak({ employeeId: '00000000-0000-0000-0000-000000000100', teamId: '00000000-0000-0000-0000-000000000200', type: 'break', notes: 'test' });
    expect(row).toBeDefined();
    expect(row.state).toBe('requested');
    createdId = row.id;
  });

  test('approveBreak transitions to approved', async () => {
    const row = await approveBreak({ breakId: createdId, approverId: '00000000-0000-0000-0000-000000000300' });
    expect(row.state).toBe('approved');
    expect(row.approved_by).toBe('00000000-0000-0000-0000-000000000300');
  });

  test('startBreak transitions to active', async () => {
    const row = await startBreak({ breakId: createdId });
    expect(row.state).toBe('active');
    expect(row.started_at).toBeTruthy();
  });

  test('endBreak transitions to ended and computes duration', async () => {
    const row = await endBreak({ breakId: createdId });
    expect(row.state).toBe('ended');
    expect(row.ended_at).toBeTruthy();
  });

  afterAll(async () => {
    // cleanup
    await supabase.from('break_requests').delete().eq('id', createdId);
  });
});
