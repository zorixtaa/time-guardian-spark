-- Apply Google OAuth configuration to production database
-- Run this in your Supabase SQL editor

-- Enable Google OAuth provider
INSERT INTO auth.providers (id, name, enabled, created_at, updated_at)
VALUES ('google', 'google', true, now(), now())
ON CONFLICT (id) DO UPDATE SET 
  enabled = true,
  updated_at = now();

-- Configure Google OAuth settings
INSERT INTO auth.config (key, value, created_at, updated_at)
VALUES 
  ('google_enabled', 'true', now(), now()),
  ('google_client_id', '1066291262307-8sgl29qov2dibhki15ao1aoscrgtne3n.apps.googleusercontent.com', now(), now()),
  ('google_client_secret', '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', now(), now())
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Update site URL configuration
UPDATE auth.config 
SET value = 'https://time-guardian-spark.vercel.app', updated_at = now()
WHERE key = 'site_url';

-- Add redirect URLs
INSERT INTO auth.config (key, value, created_at, updated_at)
VALUES 
  ('redirect_urls', '["https://time-guardian-spark.vercel.app/dashboard"]', now(), now())
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Verify the configuration
SELECT key, value FROM auth.config WHERE key IN ('google_enabled', 'google_client_id', 'site_url', 'redirect_urls');