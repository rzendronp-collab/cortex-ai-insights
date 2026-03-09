ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claude_api_key text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;