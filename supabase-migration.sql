-- Supabase Migration for Automation App
-- Run this in the Supabase SQL Editor for your project.

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  workflow_json JSONB NOT NULL DEFAULT '{"name":"","nodes":[],"connections":{}}',
  is_active BOOLEAN DEFAULT false,
  node_count INTEGER DEFAULT 0,
  has_unsupported_nodes BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL, -- AES-256-GCM encrypted JSON
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  trigger_type TEXT DEFAULT 'manual',
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  node_name TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input_data JSONB,
  output_data JSONB,
  error TEXT,
  execution_time_ms INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_user ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_node_executions_execution ON node_executions(execution_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_executions ENABLE ROW LEVEL SECURITY;

-- Workflows: users can only access their own
CREATE POLICY workflows_select ON workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY workflows_insert ON workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY workflows_update ON workflows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY workflows_delete ON workflows FOR DELETE USING (auth.uid() = user_id);

-- Credentials: users can only access their own
CREATE POLICY credentials_select ON credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY credentials_insert ON credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY credentials_update ON credentials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY credentials_delete ON credentials FOR DELETE USING (auth.uid() = user_id);

-- Executions: users can only access their own
CREATE POLICY executions_select ON executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY executions_insert ON executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY executions_update ON executions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY executions_delete ON executions FOR DELETE USING (auth.uid() = user_id);

-- Node executions: users can access if they own the parent execution
CREATE POLICY node_executions_select ON node_executions FOR SELECT
  USING (EXISTS (SELECT 1 FROM executions e WHERE e.id = execution_id AND e.user_id = auth.uid()));
CREATE POLICY node_executions_insert ON node_executions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM executions e WHERE e.id = execution_id AND e.user_id = auth.uid()));
CREATE POLICY node_executions_update ON node_executions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM executions e WHERE e.id = execution_id AND e.user_id = auth.uid()));
CREATE POLICY node_executions_delete ON node_executions FOR DELETE
  USING (EXISTS (SELECT 1 FROM executions e WHERE e.id = execution_id AND e.user_id = auth.uid()));

-- ==========================================
-- UPDATED_AT TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
