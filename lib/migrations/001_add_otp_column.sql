-- Add OTP column to rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS otp VARCHAR(6);