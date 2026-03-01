# Supabase Setup Guide

This guide explains how to set up Supabase for the VB Ideation application.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project

## Environment Variables

### Frontend (`.env` in `frontend/` directory)

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (`.env` in `backend/` directory)

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database URL (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings > API**
3. Copy the following values:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend only)
4. Navigate to **Settings > API > JWT Settings**
   - **JWT Secret** → `SUPABASE_JWT_SECRET`
5. Navigate to **Settings > Database**
   - Copy the **Connection string** (URI format) → `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` with your database password

## Database Setup

### 1. Create Tables

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Extractions table
CREATE TABLE IF NOT EXISTS extractions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name VARCHAR NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  model_used VARCHAR NOT NULL,
  compressed_text BYTEA NOT NULL,
  original_size INTEGER NOT NULL,
  compressed_size INTEGER NOT NULL,
  token_count INTEGER,
  sector VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_hash, model_used)
);

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name VARCHAR NOT NULL,
  sector VARCHAR NOT NULL,
  idea_summary TEXT NOT NULL,
  overall_score FLOAT NOT NULL,
  recommendation VARCHAR NOT NULL,
  recommendation_rationale TEXT,
  dimension_scores JSONB NOT NULL,
  key_strengths JSONB NOT NULL,
  key_concerns JSONB NOT NULL,
  model_used VARCHAR NOT NULL,
  processing_time_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_extractions_file_hash ON extractions(file_hash);
CREATE INDEX IF NOT EXISTS idx_extractions_user_id ON extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
```

### 2. Enable Row Level Security

Run the SQL script located at `backend/migrations/supabase_rls.sql` in your Supabase SQL Editor to enable Row Level Security policies.

### 3. Set Up Email Templates (Optional)

In your Supabase dashboard, go to **Authentication > Email Templates** and customize:
- Confirmation email
- Invite user email
- Magic Link email
- Reset password email

## Authentication Configuration

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure email settings:
   - Enable email confirmations
   - Set Site URL to your frontend URL (e.g., `https://scorer.moven.pro`)
   - Add redirect URLs for verification callbacks

## Deployment

### Frontend (Vercel/Netlify)

Add environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Backend (Render)

Add environment variables:
- `DATABASE_URL` (Supabase PostgreSQL connection string)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

## Migration from Existing Data

If you have existing users/data from the old database:

1. Export existing data from Render PostgreSQL
2. Import into Supabase PostgreSQL
3. For users, you'll need to:
   - Create auth entries in Supabase Auth (via admin API or manual invite)
   - Update the `users` table `id` to match Supabase auth user IDs

## Troubleshooting

### "Missing Supabase environment variables"
Ensure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in your frontend `.env` file.

### "Could not validate credentials"
- Check that `SUPABASE_JWT_SECRET` is correctly set in backend
- Ensure the JWT token hasn't expired
- Verify the token is being sent in the Authorization header

### Row Level Security errors
- Make sure you've run the RLS migration script
- Check that the user's role in Supabase is "authenticated"
- Verify policies are correctly applied (check Supabase dashboard > Authentication > Policies)
