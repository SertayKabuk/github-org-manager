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

-- Webhook events table for storing incoming GitHub webhooks
-- Events are stored first, then processed asynchronously
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  delivery_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  action VARCHAR(100),
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON webhook_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Email mappings table for storing GitHub username to email associations
-- Collected when users login with their GitHub accounts
CREATE TABLE IF NOT EXISTS email_mappings (
  id SERIAL PRIMARY KEY,
  github_username VARCHAR(255) NOT NULL,
  github_user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for email mappings
CREATE INDEX IF NOT EXISTS idx_email_mappings_email ON email_mappings(email);
CREATE INDEX IF NOT EXISTS idx_email_mappings_github_username ON email_mappings(github_username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_mappings_unique ON email_mappings(github_user_id, email);

-- Cost centers table for local caching
CREATE TABLE IF NOT EXISTS cost_centers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Budgets table for local caching
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for cost centers and budgets
CREATE INDEX IF NOT EXISTS idx_cost_centers_name ON cost_centers(name);
CREATE INDEX IF NOT EXISTS idx_budgets_name ON budgets(name);
