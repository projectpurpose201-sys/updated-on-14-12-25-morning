-- First, let's see what values are actually in the table
SELECT DISTINCT status FROM rides;

-- Drop any existing constraints
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE rides DROP CONSTRAINT ' || constraint_name || ';', ' ')
        FROM information_schema.table_constraints 
        WHERE table_name = 'rides' 
        AND constraint_type = 'CHECK'
    );
END $$;

-- Add the constraint back with TRIM and LOWER to handle case and whitespace
ALTER TABLE rides
ADD CONSTRAINT rides_status_check
CHECK (TRIM(LOWER(status)) = ANY (
    ARRAY[
        'pending',
        'accepted',
        'arrived',
        'in_progress',
        'completed',
        'cancelled'
    ]
));