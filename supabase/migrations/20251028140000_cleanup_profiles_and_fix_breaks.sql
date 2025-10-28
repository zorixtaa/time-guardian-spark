-- ============================================================================
-- COMPREHENSIVE FIX: Breaks Schema, Profiles Cleanup, and Auto-Profile Creation
-- ============================================================================
-- This migration:
-- 1. Ensures breaks.started_at and breaks.ended_at are nullable
-- 2. Cleans up duplicate profiles
-- 3. Ensures all auth users have a profile
-- 4. Creates trigger to auto-create profiles for new users
-- ============================================================================

-- =============================================================================
-- PART 1: FIX BREAKS SCHEMA
-- =============================================================================

-- Ensure started_at and ended_at are nullable in breaks table
-- This allows break requests to be created without immediately starting them
DO $$
BEGIN
    -- Make started_at nullable if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'breaks' 
        AND column_name = 'started_at' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.breaks ALTER COLUMN started_at DROP NOT NULL;
        ALTER TABLE public.breaks ALTER COLUMN started_at DROP DEFAULT;
    END IF;

    -- Make ended_at nullable if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'breaks' 
        AND column_name = 'ended_at' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.breaks ALTER COLUMN ended_at DROP NOT NULL;
        ALTER TABLE public.breaks ALTER COLUMN ended_at DROP DEFAULT;
    END IF;
END $$;

-- Update comments for clarity
COMMENT ON COLUMN public.breaks.started_at IS 'Timestamp when break actually started. NULL for pending/approved breaks that haven''t started yet.';
COMMENT ON COLUMN public.breaks.ended_at IS 'Timestamp when break ended. NULL for pending/approved/active breaks that haven''t ended yet.';

-- =============================================================================
-- PART 2: CLEAN UP DUPLICATE PROFILES
-- =============================================================================

-- Find and remove duplicate profiles, keeping only the most recent one for each user_id
DO $$
DECLARE
    duplicate_record RECORD;
    kept_profile_id UUID;
BEGIN
    -- For each user_id that has multiple profiles
    FOR duplicate_record IN 
        SELECT user_id, COUNT(*) as profile_count
        FROM public.profiles
        GROUP BY user_id
        HAVING COUNT(*) > 1
    LOOP
        -- Get the most recent profile to keep
        SELECT id INTO kept_profile_id
        FROM public.profiles
        WHERE user_id = duplicate_record.user_id
        ORDER BY created_at DESC, id DESC
        LIMIT 1;

        -- Delete all other profiles for this user
        DELETE FROM public.profiles
        WHERE user_id = duplicate_record.user_id
        AND id != kept_profile_id;

        RAISE NOTICE 'Cleaned up % duplicate profile(s) for user %', duplicate_record.profile_count - 1, duplicate_record.user_id;
    END LOOP;
END $$;

-- =============================================================================
-- PART 3: ENSURE ALL AUTH USERS HAVE PROFILES
-- =============================================================================

-- Create profiles for any auth users that don't have one
-- Note: profiles.id should match auth.users.id (not a separate UUID)
INSERT INTO public.profiles (id, user_id, display_name, team_id, created_at, updated_at)
SELECT 
    u.id as id,
    u.id as user_id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        u.email
    ) as display_name,
    NULL as team_id,
    now() as created_at,
    now() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- PART 4: CREATE TRIGGER FOR AUTO-PROFILE CREATION
-- =============================================================================

-- Function to automatically create a profile when a new user signs up
-- Note: profiles.id should match auth.users.id (not a separate UUID)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new profile for the user
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

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- PART 5: ADD UNIQUE CONSTRAINT ON PROFILES.USER_ID (if not exists)
-- =============================================================================

-- Ensure we have a unique constraint on user_id to prevent future duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_id_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION COMMENTS
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles - One per auth user, auto-created on signup. Cleaned of duplicates.';
COMMENT ON TABLE public.breaks IS 'Break records - started_at and ended_at are nullable to support pending/approved status before actual start';
