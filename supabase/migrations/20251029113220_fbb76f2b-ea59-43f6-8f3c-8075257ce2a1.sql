-- Expand app_role enum to include HR, IT, and DPO roles
-- Must be done in a separate transaction from creating functions
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'hr_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'it_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'dpo';