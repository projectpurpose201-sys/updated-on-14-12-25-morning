-- First check if ratings table exists and rename or create as needed
DO $$ 
BEGIN
    -- Update ratings table name if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ratings') THEN
        ALTER TABLE ratings RENAME TO ride_reviews;
    ELSE
        -- Create ride_reviews table if neither exists
        CREATE TABLE ride_reviews (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            ride_id UUID REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
            passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Create function to update driver's average rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET rating_avg = (
        SELECT AVG(rating)::DECIMAL(2,1)
        FROM ride_reviews
        WHERE driver_id = NEW.driver_id
    )
    WHERE id = NEW.driver_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS update_driver_rating_trigger ON ride_reviews;
CREATE TRIGGER update_driver_rating_trigger
AFTER INSERT OR UPDATE ON ride_reviews
FOR EACH ROW
EXECUTE FUNCTION update_driver_rating();