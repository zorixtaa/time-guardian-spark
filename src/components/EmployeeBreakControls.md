````markdown name=src/components/EmployeeBreakControls.md
```tsx
// Example React component snippet (TypeScript + React)
// Use appropriate styling and state management of your app
import React from 'react';
import { supabase } from '../lib/supabase';
import { requestBreak, cancelBreak, startBreak, endBreak } from '../lib/attendance';

export default function EmployeeBreakControls({ request, teamId }) {
  // request is the current break row for the user (if any)
  // show controls depending on state: requested => cancel; approved => start; active => end
  const user = supabase.auth.getUser ? supabase.auth.getUser() : null;

  if (!request) {
    return (
      <div>
        <button
          onClick={() =>
            requestBreak({ employeeId: user?.id || 'unknown', teamId, type: 'break' })
          }
        >
          Request Break
        </button>
        <button
          onClick={() =>
            requestBreak({ employeeId: user?.id || 'unknown', teamId, type: 'lunch' })
          }
        >
          Request Lunch
        </button>
      </div>
    );
  }

  if (request.state === 'requested') {
    return <button onClick={() => cancelBreak({ breakId: request.id })}>Cancel Request</button>;
  }

  if (request.state === 'approved') {
    return <button onClick={() => startBreak({ breakId: request.id })}>Start</button>;
  }

  if (request.state === 'active') {
    return <button onClick={() => endBreak({ breakId: request.id })}>End</button>;
  }

  return <div>Status: {request.state}</div>;
}
````