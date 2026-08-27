-- Migration to add lead_id to activities and entity_notes
USE deals_db;

-- Add lead_id to activities
ALTER TABLE activities ADD COLUMN lead_id INT AFTER company_id;
ALTER TABLE activities ADD CONSTRAINT fk_activities_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE activities ADD INDEX idx_lead_id (lead_id);

-- Add lead_id to entity_notes
ALTER TABLE entity_notes ADD COLUMN lead_id INT AFTER project_id;
ALTER TABLE entity_notes ADD CONSTRAINT fk_notes_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE entity_notes ADD INDEX idx_lead_id (lead_id);
