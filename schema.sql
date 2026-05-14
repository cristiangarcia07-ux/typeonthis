-- ============================================================
-- 0. DROP EVERYTHING (order: children first, then parents)
-- ============================================================
DROP TABLE IF EXISTS match_participants CASCADE;
DROP TABLE IF EXISTS daily_leaderboard CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS match_mode CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS get_random_quote CASCADE;
DROP FUNCTION IF EXISTS add_xp CASCADE;
DROP FUNCTION IF EXISTS reset_daily_leaderboard CASCADE;

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. ENUMS
-- ============================================================
CREATE TYPE match_mode AS ENUM ('solo', 'race', 'timed');

-- ============================================================
-- 3. TABLES
-- ============================================================

-- PUBLIC USER PROFILES (mirrors auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QUOTES
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  difficulty_rating DECIMAL(3, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MATCHES
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  mode match_mode NOT NULL,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- MATCH PARTICIPANTS
CREATE TABLE match_participants (
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wpm DECIMAL(6, 2) NOT NULL,
  accuracy DECIMAL(5, 2) NOT NULL,
  rank INTEGER NOT NULL,
  PRIMARY KEY (match_id, user_id)
);

-- USER STATS (all-time)
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  average_wpm DECIMAL(6, 2) DEFAULT 0,
  top_wpm DECIMAL(6, 2) DEFAULT 0,
  matches_played INTEGER DEFAULT 0
);

-- DAILY LEADERBOARD (resets each day)
CREATE TABLE daily_leaderboard (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  wpm DECIMAL(6, 2) NOT NULL DEFAULT 0,
  accuracy DECIMAL(5, 2) NOT NULL DEFAULT 0,
  races_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX idx_matches_quote_id ON matches(quote_id);
CREATE INDEX idx_matches_created_by ON matches(created_by);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX idx_daily_leaderboard_date ON daily_leaderboard(date);

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Auto-create profile + stats when user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO users (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1))
  );
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  INSERT INTO daily_leaderboard (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER before_user_update
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Get a random quote for practice
CREATE OR REPLACE FUNCTION get_random_quote()
RETURNS SETOF quotes
LANGUAGE sql
AS $$
  SELECT * FROM quotes ORDER BY random() LIMIT 1;
$$;

-- Add XP to a user
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_xp INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users SET total_xp = total_xp + p_xp WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- 7. DAILY LEADERBOARD RESET FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION reset_daily_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM daily_leaderboard WHERE date < CURRENT_DATE;
END;
$$;

-- ============================================================
-- 8. SEED QUOTES (sample data)
-- ============================================================
INSERT INTO quotes (content, difficulty_rating) VALUES
('The quick brown fox jumps over the lazy dog.', 1.00),
('Success is not final, failure is not fatal: it is the courage to continue that counts.', 2.50),
('In the middle of difficulty lies opportunity.', 2.00),
('Life is what happens when you are busy making other plans.', 2.00),
('The only way to do great work is to love what you do.', 2.00),
('To be or not to be, that is the question.', 1.50),
('It does not matter how slowly you go as long as you do not stop.', 2.50),
('The journey of a thousand miles begins with a single step.', 2.00),
('Believe you can and you are halfway there.', 1.50),
('The future belongs to those who believe in the beauty of their dreams.', 2.50);
