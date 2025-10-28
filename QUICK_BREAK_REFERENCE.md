# Quick Break System Reference

## For Employees

### How to Use Breaks

1. **Clock In** first (top left button)

2. **Take a break** by clicking one of the 3 pictogram buttons:
   - 🟠 **COFFEE** - Coffee/short breaks
   - 🔵 **WC** - Bathroom breaks
   - 🟢 **LUNCH** - Lunch breaks

3. **End the break** by clicking the same button again (it will glow when active)

4. **Clock Out** when done (top right button) - automatically ends all active breaks

### Multiple Breaks
- You can have multiple breaks active at the same time
- Each break type tracks independently
- All break time is deducted from your total work time

### Dashboard Metrics
- **Total Clocked**: Raw time from clock in to clock out
- **Effective Work**: Total time MINUS all breaks (your actual work time)
- **Coffee/WC/Lunch Breaks**: Individual time spent on each break type

## For Admins

### Active Breaks Card
- See all currently active breaks across all employees
- Force-end any break if needed
- No approval queue (breaks are instant)

### Break Monitoring
- Breaks start immediately when clicked (no approval needed)
- All break time is automatically tracked and deducted
- Historical break data preserved in database

## Technical Details

### Break Types
- `coffee` - Coffee breaks, short breaks
- `wc` - Bathroom/toilet breaks
- `lunch` - Lunch breaks

### Break States
- `active` - Currently on break
- `completed` - Break has ended

### Database
- Each break is linked to an attendance record via `attendance_id`
- Breaks are auto-ended when user clocks out
- All break times are calculated in real-time

## Color Coding
- 🟠 **Orange** - Coffee breaks (energizing, warm)
- 🔵 **Blue** - WC breaks (quick, cool)
- 🟢 **Green** - Lunch breaks (fresh, healthy)
- 🟡 **Yellow** - Primary actions (Clock In/Out, main UI)

## Migration
Run this migration to enable the new system:
```sql
-- File: supabase/migrations/20251028150000_instant_break_system.sql
```

The migration will:
- Convert old break types to new system
- Remove approval workflow
- Clean up pending/approved breaks
- Add attendance_id links
