-- Supabase Row Level Security (RLS) Policies
-- Run this script in your Supabase SQL Editor to set up RLS

-- ============================================
-- USERS TABLE
-- ============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (except admin status)
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin = (SELECT is_admin FROM users WHERE id = auth.uid())  -- Prevent self-promotion to admin
);

-- Allow inserting new user profiles (during registration)
CREATE POLICY "Allow user profile creation"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can update all users
CREATE POLICY "Admins can update all users"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can delete users (except themselves)
CREATE POLICY "Admins can delete users"
ON users FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
  AND id != auth.uid()  -- Prevent admin self-deletion
);


-- ============================================
-- EXTRACTIONS TABLE
-- ============================================

-- Enable RLS on extractions table
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;

-- Users can read their own extractions
CREATE POLICY "Users can read own extractions"
ON extractions FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can create extractions
CREATE POLICY "Users can create extractions"
ON extractions FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can delete their own extractions
CREATE POLICY "Users can delete own extractions"
ON extractions FOR DELETE
USING (user_id = auth.uid());

-- Admins can read all extractions
CREATE POLICY "Admins can read all extractions"
ON extractions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can delete any extraction
CREATE POLICY "Admins can delete all extractions"
ON extractions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);


-- ============================================
-- ANALYSES TABLE
-- ============================================

-- Enable RLS on analyses table
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Users can read their own analyses
CREATE POLICY "Users can read own analyses"
ON analyses FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can create analyses
CREATE POLICY "Users can create analyses"
ON analyses FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
ON analyses FOR DELETE
USING (user_id = auth.uid());

-- Admins can read all analyses
CREATE POLICY "Admins can read all analyses"
ON analyses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can delete any analysis
CREATE POLICY "Admins can delete all analyses"
ON analyses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, is_verified, is_active, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE users.is_verified END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on Supabase auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to update profile when email is verified
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();


-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on public schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, DELETE ON extractions TO authenticated;
GRANT SELECT, INSERT, DELETE ON analyses TO authenticated;

-- Grant sequence permissions (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
