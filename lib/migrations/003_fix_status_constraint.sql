-- Drop existing constraint with potential incorrect names
DO $$ 
BEGIN
    -- Try to drop constraint with space
    ALTER TABLE rides DROP CONSTRAINT IF EXISTS "rides_STATUS _CHECK";
    -- Try to drop constraint without space
    ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add the constraint back with correct format and values
ALTER TABLE rides
    ADD CONSTRAINT rides_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'arrived'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));