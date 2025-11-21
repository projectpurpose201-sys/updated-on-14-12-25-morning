ALTER TABLE rides
ADD COLUMN contact_phone VARCHAR(15);

-- Update constraints to require contact phone for new rides
ALTER TABLE rides
ADD CONSTRAINT rides_contact_phone_check 
CHECK (
  (status = 'pending' AND contact_phone IS NOT NULL) OR 
  status != 'pending'
);