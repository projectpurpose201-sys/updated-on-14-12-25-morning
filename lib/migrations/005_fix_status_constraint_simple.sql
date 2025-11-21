-- First, remove ALL existing status constraints to start fresh
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE rides DROP CONSTRAINT ' || quote_ident(constraint_name) || ';', ' ')
        FROM information_schema.table_constraints 
        WHERE table_name = 'rides' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status%'
    );
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Now add a simple, exact constraint
ALTER TABLE rides ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE rides ADD CONSTRAINT rides_status_check 
CHECK (status IN ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'));