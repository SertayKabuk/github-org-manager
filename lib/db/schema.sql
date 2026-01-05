-- Invitations table for tracking GitHub organization invitations
-- This allows matching GitHub usernames with company emails

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  github_username VARCHAR(255),
  github_user_id INTEGER,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'failed')),
  github_invitation_id INTEGER,
  role VARCHAR(50) DEFAULT 'member',
  team_ids INTEGER[],
  inviter_login VARCHAR(255),
  inviter_id INTEGER,
  invited_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_github_username ON invitations(github_username);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_github_invitation_id ON invitations(github_invitation_id);
