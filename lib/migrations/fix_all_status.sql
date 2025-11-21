-- Step 1: Drop ALL existing status constraints
DO $$ 
BEGIN
    -- Drop any constraint with 'status' in the name
    EXECUTE (
        SELECT string_agg('ALTER TABLE rides DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name) || ';', ' ')
        FROM information_schema.table_constraints 
        WHERE table_name = 'rides' 
        AND constraint_name ILIKE '%status%'
    );
END $$;

-- Step 2: Update any incorrect status values to valid ones
UPDATE rides 
SET status = CASE 
    WHEN LOWER(TRIM(status)) LIKE '%accept%' THEN 'accepted'
    WHEN LOWER(TRIM(status)) LIKE '%arrive%' THEN 'arrived'
    WHEN LOWER(TRIM(status)) LIKE '%progress%' THEN 'in_progress'
    WHEN LOWER(TRIM(status)) LIKE '%complete%' THEN 'completed'
    WHEN LOWER(TRIM(status)) LIKE '%cancel%' THEN 'cancelled'
    ELSE 'pending'
END;

-- Step 3: Add back the constraint
ALTER TABLE rides 
ADD CONSTRAINT rides_status_check 
CHECK (status IN ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'));

-- Step 4: Verify current status values
SELECT DISTINCT status FROM rides ORDER BY status;