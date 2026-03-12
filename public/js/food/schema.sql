-- ============================================================
-- KIVU FOOD — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- Restaurants
CREATE TABLE restaurants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    category        TEXT NOT NULL,                          -- 'Restaurant', 'Cafe', 'Grill', 'Fast Food'
    address         TEXT,
    phone           TEXT,
    lat             NUMERIC(10, 7),                         -- latitude
    lng             NUMERIC(10, 7),                         -- longitude
    cover_image_url TEXT,
    youtube_url     TEXT,
    hours           JSONB,                                  -- { "mon": "08:00-23:00", "tue": "08:00-23:00", ... }
    is_open         BOOLEAN DEFAULT FALSE,
    is_vip          BOOLEAN DEFAULT FALSE,                  -- VIP shown first in feed
    tags            TEXT[] DEFAULT '{}',                    -- ['wifi', 'halal', 'parking', 'football', 'outlets']
    status          TEXT DEFAULT 'pending'                  -- 'pending' | 'approved' | 'rejected'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE menu_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,                          -- 'Main Courses', 'Drinks', 'Desserts'
    sort_order      INTEGER DEFAULT 0
);

-- Menu Items
CREATE TABLE menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    price           INTEGER NOT NULL,                       -- in RWF
    image_url       TEXT,
    is_available    BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0
);

-- Reviews
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    reviewer_name   TEXT NOT NULL,
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant Applications
CREATE TABLE merchant_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    address         TEXT,
    phone           TEXT,
    hours           TEXT,                                   -- free text at submission stage
    youtube_url     TEXT,
    menu_text       TEXT,
    status          TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE restaurants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_applications ENABLE ROW LEVEL SECURITY;

-- restaurants: anyone can read approved ones only
CREATE POLICY "Public can read approved restaurants"
    ON restaurants FOR SELECT
    USING (status = 'approved');

-- menu_categories: anyone can read if restaurant is approved
CREATE POLICY "Public can read menu categories"
    ON menu_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = menu_categories.restaurant_id
            AND r.status = 'approved'
        )
    );

-- menu_items: anyone can read available items of approved restaurants
CREATE POLICY "Public can read menu items"
    ON menu_items FOR SELECT
    USING (
        is_available = TRUE
        AND EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = menu_items.restaurant_id
            AND r.status = 'approved'
        )
    );

-- reviews: anyone can read, anyone can insert, nobody can update/delete
CREATE POLICY "Public can read reviews"
    ON reviews FOR SELECT
    USING (TRUE);

CREATE POLICY "Public can submit reviews"
    ON reviews FOR INSERT
    WITH CHECK (TRUE);

-- merchant_applications: anyone can submit, nobody can read from frontend
CREATE POLICY "Public can submit merchant applications"
    ON merchant_applications FOR INSERT
    WITH CHECK (TRUE);


-- ============================================================
-- 3. HELPER VIEW — restaurants with average rating
-- This saves a join on every feed load
-- ============================================================

CREATE VIEW restaurants_with_rating AS
SELECT
    r.*,
    ROUND(AVG(rv.rating), 1)    AS avg_rating,
    COUNT(rv.id)                 AS review_count
FROM restaurants r
LEFT JOIN reviews rv ON rv.restaurant_id = r.id
WHERE r.status = 'approved'
GROUP BY r.id
ORDER BY r.is_vip DESC, avg_rating DESC;


-- ============================================================
-- 4. SEED DATA — Kigali Heights Resto (matches the HTML mockup)
-- ============================================================

-- Insert restaurant
INSERT INTO restaurants (
    id, name, description, category, address, phone,
    lat, lng, cover_image_url, youtube_url,
    hours, is_open, is_vip, tags, status
) VALUES (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Kigali Heights Resto',
    'A premium dining experience in the heart of Kigali. African and European fusion cuisine with a stunning city view.',
    'Restaurant',
    'KN 5 Rd, Kigali',
    '+250 788 123 456',
    -1.9441, 30.0619,
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '{"mon":"08:00-23:00","tue":"08:00-23:00","wed":"08:00-23:00","thu":"08:00-23:00","fri":"08:00-23:00","sat":"08:00-23:00","sun":"08:00-23:00"}',
    TRUE,
    TRUE,
    ARRAY['wifi', 'parking', 'halal'],
    'approved'
);

-- Insert menu categories
INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Main Courses', 1),
    ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Beverages', 2);

-- Insert menu items
INSERT INTO menu_items (restaurant_id, category_id, name, description, price, image_url, sort_order) VALUES
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001',
        'Kivu Signature Burger',
        'Double beef patty, cheese, signature sauce, french fries.',
        5500,
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=60',
        1
    ),
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001',
        'Piri-Piri Chicken',
        'Half grilled chicken, side salad, choice of rice or potatoes.',
        7000,
        NULL,
        2
    ),
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000002',
        'Fresh Passion Fruit Juice',
        NULL,
        1500,
        NULL,
        1
    );

-- Insert reviews
INSERT INTO reviews (restaurant_id, reviewer_name, rating, comment) VALUES
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'David N.',
        5,
        'Best burger in town! And the Wi-Fi is super fast, great for working.'
    ),
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'Amina K.',
        5,
        'Amazing food and great atmosphere. Will definitely come back!'
    );