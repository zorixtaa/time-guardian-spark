#!/usr/bin/env tsx

/**
 * Direct Database Setup Script
 * 
 * This script sets up the database by executing SQL statements directly
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...\n')
    
    // Step 1: Create enums
    console.log('📄 Creating enums...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Create app_role enum
        DO $$ BEGIN
            CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'employee');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        -- Create break_type_enum
        DO $$ BEGIN
            CREATE TYPE public.break_type_enum AS ENUM ('coffee', 'wc', 'lunch');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
            CREATE TYPE public.break_status_enum AS ENUM ('pending', 'approved', 'denied', 'active', 'completed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        -- Create session_status enum
        DO $$ BEGIN
            CREATE TYPE public.session_status AS ENUM ('active', 'ended');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
      `
    })
    
    console.log('✅ Enums created successfully!')
    
    // Step 2: Create core tables
    console.log('📄 Creating core tables...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Create teams table
        CREATE TABLE IF NOT EXISTS public.teams (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create profiles table
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            display_name TEXT NOT NULL,
            team_id UUID REFERENCES public.teams(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create user_roles table
        CREATE TABLE IF NOT EXISTS public.user_roles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role public.app_role NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, role)
        );

        -- Create shifts table
        CREATE TABLE IF NOT EXISTS public.shifts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            team_id UUID REFERENCES public.teams(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create attendance table
        CREATE TABLE IF NOT EXISTS public.attendance (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            clock_in_at TIMESTAMPTZ NOT NULL,
            clock_out_at TIMESTAMPTZ,
            shift_id UUID REFERENCES public.shifts(id),
            device_fingerprint TEXT,
            source_ip TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create breaks table
        CREATE TABLE IF NOT EXISTS public.breaks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
            team_id UUID REFERENCES public.teams(id),
            type public.break_type_enum NOT NULL,
            status public.break_status_enum NOT NULL,
            started_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            approved_by UUID REFERENCES auth.users(id),
            approved_at TIMESTAMPTZ,
            denied_by UUID REFERENCES auth.users(id),
            denied_at TIMESTAMPTZ,
            denial_reason TEXT,
            reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    console.log('✅ Core tables created successfully!')
    
    // Step 3: Create additional tables
    console.log('📄 Creating additional tables...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Create break_entitlements table
        CREATE TABLE IF NOT EXISTS public.break_entitlements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            micro_break_used INTEGER NOT NULL DEFAULT 0, -- minutes
            lunch_break_used INTEGER NOT NULL DEFAULT 0, -- minutes
            micro_break_limit INTEGER NOT NULL DEFAULT 30, -- minutes per day
            lunch_break_limit INTEGER NOT NULL DEFAULT 60, -- minutes per day
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, date)
        );

        -- Create entitlement_notifications table
        CREATE TABLE IF NOT EXISTS public.entitlement_notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            notification_type TEXT NOT NULL CHECK (notification_type IN ('micro_break_exceeded', 'lunch_break_exceeded')),
            entitlement_date DATE NOT NULL,
            exceeded_amount INTEGER NOT NULL, -- minutes exceeded
            acknowledged BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create announcements table
        CREATE TABLE IF NOT EXISTS public.announcements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            created_by UUID NOT NULL REFERENCES auth.users(id),
            team_id UUID REFERENCES public.teams(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create XP ledger table
        CREATE TABLE IF NOT EXISTS public.xp_ledger (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            points INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create bonus payouts table
        CREATE TABLE IF NOT EXISTS public.bonus_payouts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            amount NUMERIC(10, 2) NOT NULL,
            reason TEXT NOT NULL,
            month DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, paid
            approved_by UUID REFERENCES auth.users(id),
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create gamification settings table
        CREATE TABLE IF NOT EXISTS public.gamification_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            setting_key TEXT NOT NULL UNIQUE,
            setting_value JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    console.log('✅ Additional tables created successfully!')
    
    // Step 4: Create utility functions
    console.log('📄 Creating utility functions...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Function to update updated_at column
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to get user team
        CREATE OR REPLACE FUNCTION public.get_user_team(user_uuid UUID)
        RETURNS UUID AS $$
        DECLARE
            team_uuid UUID;
        BEGIN
            SELECT team_id INTO team_uuid
            FROM public.profiles
            WHERE user_id = user_uuid;
            
            RETURN team_uuid;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to check if user has role
        CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name public.app_role)
        RETURNS BOOLEAN AS $$
        DECLARE
            has_role BOOLEAN := FALSE;
        BEGIN
            SELECT EXISTS(
                SELECT 1 FROM public.user_roles
                WHERE user_id = user_uuid AND role = role_name
            ) INTO has_role;
            
            RETURN has_role;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to handle new user creation
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO public.profiles (id, user_id, display_name, team_id, created_at, updated_at)
            VALUES (
                NEW.id,
                NEW.id,
                COALESCE(
                    NEW.raw_user_meta_data->>'display_name',
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'name',
                    NEW.email
                ),
                NULL,
                now(),
                now()
            )
            ON CONFLICT (user_id) DO NOTHING;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })
    
    console.log('✅ Utility functions created successfully!')
    
    // Step 5: Enable RLS
    console.log('📄 Enabling Row Level Security...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.break_entitlements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.entitlement_notifications ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.bonus_payouts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;
      `
    })
    
    console.log('✅ Row Level Security enabled successfully!')
    
    // Step 6: Create basic RLS policies
    console.log('📄 Creating basic RLS policies...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Teams policies
        CREATE POLICY "Users can view their team"
        ON public.teams
        FOR SELECT
        USING (id = get_user_team(auth.uid()));

        CREATE POLICY "Super admins can manage teams"
        ON public.teams
        FOR ALL
        USING (has_role(auth.uid(), 'super_admin'::app_role));

        -- Profiles policies
        CREATE POLICY "Users can view their own profile"
        ON public.profiles
        FOR SELECT
        USING (user_id = auth.uid());

        CREATE POLICY "Users can update their own profile"
        ON public.profiles
        FOR UPDATE
        USING (user_id = auth.uid());

        CREATE POLICY "Super admins can manage profiles"
        ON public.profiles
        FOR ALL
        USING (has_role(auth.uid(), 'super_admin'::app_role));

        -- User roles policies
        CREATE POLICY "Users can view their own roles"
        ON public.user_roles
        FOR SELECT
        USING (user_id = auth.uid());

        CREATE POLICY "Super admins can manage roles"
        ON public.user_roles
        FOR ALL
        USING (has_role(auth.uid(), 'super_admin'::app_role));

        -- Attendance policies
        CREATE POLICY "Users can view their own attendance"
        ON public.attendance
        FOR SELECT
        USING (user_id = auth.uid());

        CREATE POLICY "Users can insert their own attendance"
        ON public.attendance
        FOR INSERT
        WITH CHECK (user_id = auth.uid());

        CREATE POLICY "Users can update their own attendance"
        ON public.attendance
        FOR UPDATE
        USING (user_id = auth.uid());

        CREATE POLICY "Super admins can manage attendance"
        ON public.attendance
        FOR ALL
        USING (has_role(auth.uid(), 'super_admin'::app_role));

        -- Breaks policies
        CREATE POLICY "Users can view their own breaks"
        ON public.breaks
        FOR SELECT
        USING (user_id = auth.uid());

        CREATE POLICY "Users can insert their own breaks"
        ON public.breaks
        FOR INSERT
        WITH CHECK (user_id = auth.uid());

        CREATE POLICY "Users can update their own breaks"
        ON public.breaks
        FOR UPDATE
        USING (user_id = auth.uid());

        CREATE POLICY "Super admins can manage breaks"
        ON public.breaks
        FOR ALL
        USING (has_role(auth.uid(), 'super_admin'::app_role));
      `
    })
    
    console.log('✅ Basic RLS policies created successfully!')
    
    // Step 7: Insert default data
    console.log('📄 Inserting default data...')
    await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Insert default gamification settings
        INSERT INTO public.gamification_settings (setting_key, setting_value) VALUES
        ('badge_thresholds', '{
          "punctuality_bronze": 5,
          "punctuality_silver": 10,
          "punctuality_gold": 20,
          "streak_master_1": 5,
          "streak_master_2": 10,
          "streak_master_3": 20,
          "focus_badge": 5,
          "consistency_badge": 1
        }'::jsonb),
        ('xp_rewards', '{
          "on_time_day": 10,
          "perfect_day": 20,
          "perfect_week": 50
        }'::jsonb),
        ('bonus_thresholds', '{
          "monthly_12_perfect_days": 25,
          "top_10_percent": 10
        }'::jsonb)
        ON CONFLICT (setting_key) DO NOTHING;
      `
    })
    
    console.log('✅ Default data inserted successfully!')
    
    console.log('\n🎉 Database setup completed successfully!')
    console.log('All tables, functions, and policies have been created.')
    
  } catch (error) {
    console.error('\n❌ Error setting up database:', error)
    process.exit(1)
  }
}

// Run the database setup
setupDatabase().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})