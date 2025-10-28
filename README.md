# Attendance Tracking System with Gamification

A comprehensive employee attendance tracking system developed by **Zouhair O**. Built with React, TypeScript, Vite, and Supabase. Features real-time tracking, break management, team administration, and gamification with XP and badges.

## 🎯 Quick Links

- **🚀 [QUICK START GUIDE](./QUICK_START.md)** - Start here!
- **📋 [VERIFICATION REPORT](./VERIFICATION_REPORT.md)** - Full system analysis
- **📖 [MIGRATION GUIDE](./MIGRATION_GUIDE.md)** - Database setup instructions

## ✨ Features

### For Employees
- ✅ Clock in/out with real-time tracking
- ✅ Request breaks (bathroom, lunch, scheduled, emergency)
- ✅ View personal metrics (worked time, break time, streak)
- ✅ XP system with levels and progress
- ✅ Badge achievements

### For Admins
- ✅ View team roster and status
- ✅ Approve/reject break requests
- ✅ Force-end breaks when needed
- ✅ View real-time activity feed
- ✅ Monitor team metrics

### For Super Admins
- ✅ View all users across all teams
- ✅ Create and manage departments
- ✅ Assign users to teams
- ✅ Promote and demote admins
- ✅ Full system access and control

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React Query, React Hooks
- **Routing**: React Router v6
- **Icons**: Lucide React

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Verify database connection
npm run verify-db

# Check migration status
npm run db:status
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Apply Database Migrations (REQUIRED)
See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions.

Quick version:
1. Go to Supabase SQL Editor
2. Run each migration file in `/supabase/migrations/` in order
3. **IMPORTANT**: Run `20251028120000_fix_rls_and_superadmin_access.sql`

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test the System
See [QUICK_START.md](./QUICK_START.md) for testing procedures.

## 📊 Database Schema

### Core Tables
- `profiles` - User profiles and team assignments
- `attendance` - Clock in/out records
- `breaks` - Break requests and tracking
- `teams` - Departments/teams
- `user_roles` - Role assignments (employee, admin, super_admin)
- `shifts` - Shift schedules
- `sessions` - Work sessions
- `badges` - Achievement badges
- `user_badges` - User badge awards
- `xp_ledger` - Experience points tracking
- `bonus_payouts` - Bonus payment tracking
- `gamification_settings` - XP and badge configuration
- `files` - File uploads
- `announcements` - Team announcements
- `metrics_daily` - Daily performance metrics

## 🔐 Security

### Row Level Security (RLS)
All tables have RLS enabled with three-tier access control:

| Role | Access Level |
|------|-------------|
| **Super Admin** | Full access to all tables and all data |
| **Admin** | Team-scoped access (their team + unassigned users) |
| **Employee** | Self-only access (can only see/modify their own data) |

### Authentication
- Supabase Auth with email/password
- Session persistence with localStorage
- Automatic token refresh

## 📁 Project Structure

```
/workspace
├── src/
│   ├── components/
│   │   ├── admin/         # Admin dashboard components
│   │   ├── attendance/    # Attendance UI components
│   │   ├── ui/           # Shadcn/ui components
│   │   └── xp/           # XP system components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/
│   │   └── supabase/     # Supabase client and types
│   ├── lib/              # Utility functions
│   ├── pages/            # Route pages
│   └── types/            # TypeScript definitions
├── supabase/
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts
├── QUICK_START.md        # Quick start guide
├── VERIFICATION_REPORT.md # System verification report
└── MIGRATION_GUIDE.md    # Database migration guide
```

## 🔧 Available Scripts

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run verify-db    # Verify database connection
npm run db:status    # Check migration files
```

## 🧪 Testing

### Automated Database Verification
```bash
npm run verify-db
```

This tests:
- ✅ Database connection
- ✅ All table access
- ✅ Helper functions (has_role, get_user_team)
- ✅ RLS policies

### Manual Testing

**Superadmin Login:**
- Email: `zouhair.ouqaf@market-wave.com`
- Should see: "Super Admin Control Center"
- Can: See all teams, create departments, manage admins

**Admin Login:**
- Any user with 'admin' role
- Should see: "Admin Command Center"
- Can: View team, approve breaks, manage team members

**Employee Login:**
- Any regular employee
- Should see: Standard dashboard
- Can: Check in/out, request breaks, view own metrics

## 📝 Configuration

### Supabase
- **URL**: `https://elnarrbpsphoxgldzehh.supabase.co`
- **Configuration**: `/src/integrations/supabase/client.ts`
- **Types**: Auto-generated in `/src/integrations/supabase/types.ts`

### Environment Variables
Create a `.env` file (if needed for local overrides):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🐛 Troubleshooting

### Database Connection Issues
1. Run `npm run verify-db` to check connectivity
2. Verify migrations are applied (see MIGRATION_GUIDE.md)
3. Check Supabase project status

### Permission Denied Errors
1. Ensure RLS migration is applied
2. Verify user has correct role in `user_roles` table
3. Check that helper functions exist

### Break Request Issues
1. Ensure `breaks.started_at` is nullable (migration 20251028000001)
2. Verify break status transitions are correct
3. Check admin approval permissions

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed troubleshooting.

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick reference and action items
- **[VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md)** - Complete system analysis
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Database migration instructions

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` to check code quality
4. Test thoroughly (especially database queries)
5. Submit a pull request

## 📄 License

Private project - All rights reserved  
**Developed by:** Zouhair O

## 🆘 Support

For issues or questions:
1. Check the documentation files listed above
2. Run `npm run verify-db` for database issues
3. Contact Zouhair O

---

**Status**: ✅ Production Ready  
**Last Updated**: October 28, 2025  
**Version**: 1.0.0
