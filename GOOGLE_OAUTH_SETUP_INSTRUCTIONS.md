# Google OAuth Setup Instructions

The previous migration file tried to directly modify Supabase's internal auth tables, which is not allowed. Instead, you need to configure Google OAuth through the Supabase Dashboard.

## Step 1: Configure Google OAuth in Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/elnarrbpsphoxgldzehh
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click to configure it
4. Enable Google provider
5. Enter the following credentials:
   - **Client ID**: `1066291262307-8sgl29qov2dibhki15ao1aoscrgtne3n.apps.googleusercontent.com`
   - **Client Secret**: `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`

## Step 2: Configure Redirect URLs

1. In the same **Authentication** > **URL Configuration** section
2. Set the **Site URL** to: `https://time-guardian-spark.vercel.app`
3. Add to **Redirect URLs**:
   - `https://time-guardian-spark.vercel.app/dashboard`
   - `https://time-guardian-spark.vercel.app/auth/callback` (if needed)

## Step 3: Verify Configuration

Your `supabase/config.toml` already has the correct configuration:
```toml
[auth]
site_url = "https://time-guardian-spark.vercel.app"
additional_redirect_urls = ["https://time-guardian-spark.vercel.app/dashboard"]

[auth.external.google]
enabled = true
client_id = "1066291262307-8sgl29qov2dibhki15ao1aoscrgtne3n.apps.googleusercontent.com"
secret = "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"
```

## Step 4: Test the Setup

1. Deploy your application to Vercel
2. Try signing in with Google
3. You should be redirected to `https://time-guardian-spark.vercel.app/dashboard`

## Note

The `apply_google_oauth_migration.sql` file should NOT be run as it attempts to modify internal Supabase tables that are not accessible through regular SQL migrations.