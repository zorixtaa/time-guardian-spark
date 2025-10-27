import React, { useEffect, useState } from 'react';
import { subscribeToBreakRequests, approveBreak, forceEndBreak } from '../lib/attendance';
import { supabase } from '../lib/supabase';

export default function AdminBreakModeration({ teamId }) {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    // initial fetch
    (async () => {
      const { data } = await supabase
        .from('break_requests')
        .select('*')
        .eq('team_id', teamId)
        .in('state', ['requested', 'active', 'approved']);
      if (mounted) setRequests(data || []);
    })();

    const sub = subscribeToBreakRequests({
      teamId,
      callback: async () => {
        const { data } = await supabase
          .from('break_requests')
          .select('*')
          .eq('team_id', teamId)
          .in('state', ['requested', 'active', 'approved']);
        if (mounted) setRequests(data || []);
      },
    });

    return () => {
      mounted = false;
      sub.unsubscribe?.();
    };
  }, [teamId]);

  const userId = supabase.auth.getUser ? supabase.auth.getUser()?.id : undefined;

  return (
    <div>
      <h3>Pending Break Requests ({requests.length})</h3>
      <ul>
        {requests.map((r) => (
          <li key={r.id}>
            {r.employee_id} — {r.type} — {r.state} — {r.requested_notes || ''}
            {r.state === 'requested' && (
              <button onClick={() => approveBreak({ breakId: r.id, approverId: userId })}>
                Approve
              </button>
            )}
            {r.state === 'active' && (
              <button onClick={() => forceEndBreak({ breakId: r.id, actorId: userId })}>
                Force End
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}