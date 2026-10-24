ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'place_created';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'place_updated';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'place_confirmed';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'place_deleted';

ALTER TYPE admin_action_entity_enum ADD VALUE IF NOT EXISTS 'place';
