
-- ── FUNCTIONS ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_funeral_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_provider_id UUID;
    cat             JSONB;
    item            JSONB;
    sort_i          INTEGER := 0;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO funeral_providers (name, description, category, address, phone, lat, lng,
            cover_image_url, youtube_url, hours, tags, is_open, is_vip, status)
        VALUES (NEW.name, NEW.description, NEW.category,
            NEW.address, NEW.phone, NEW.lat, NEW.lng,
            NEW.cover_image_url, NEW.youtube_url,
            CASE WHEN NEW.hours IS NOT NULL THEN jsonb_build_object('display', NEW.hours) ELSE NULL END,
            COALESCE(NEW.tags, '{}'),
            FALSE, FALSE, 'approved')
        RETURNING id INTO new_provider_id;

        IF NEW.menu_data IS NOT NULL AND jsonb_array_length(NEW.menu_data) > 0 THEN
            FOR cat IN SELECT * FROM jsonb_array_elements(NEW.menu_data) LOOP
                sort_i := 0;
                FOR item IN SELECT * FROM jsonb_array_elements(cat->'items') LOOP
                    sort_i := sort_i + 1;
                    INSERT INTO funeral_services (provider_id, category, name, description, price, is_available, sort_order)
                    VALUES (new_provider_id, cat->>'name', item->>'name',
                        NULLIF(item->>'description', ''),
                        NULLIF(item->>'price', '')::INTEGER,
                        TRUE, sort_i);
                END LOOP;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_merchant_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_restaurant_id UUID;
    cat               JSONB;
    item              JSONB;
    new_category_id   UUID;
    sort_cat          INTEGER := 0;
    sort_item         INTEGER := 0;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN

        INSERT INTO restaurants (
            name, description, category, address, phone, lat, lng,
            cover_image_url, youtube_url, hours, tags, is_open, is_vip, status
        ) VALUES (
            NEW.name, NEW.description, COALESCE(NEW.category, 'Restaurant'),
            NEW.address, NEW.phone, NEW.lat, NEW.lng,
            NEW.cover_image_url, NEW.youtube_url,
            CASE WHEN NEW.hours IS NOT NULL THEN
                jsonb_build_object(
                    'mon', NEW.hours, 'tue', NEW.hours, 'wed', NEW.hours,
                    'thu', NEW.hours, 'fri', NEW.hours, 'sat', NEW.hours, 'sun', NEW.hours
                )
            ELSE NULL END,
            COALESCE(NEW.tags, '{}'),
            FALSE, FALSE, 'approved'
        )
        RETURNING id INTO new_restaurant_id;

        IF NEW.menu_data IS NOT NULL AND jsonb_array_length(NEW.menu_data) > 0 THEN
            FOR cat IN SELECT * FROM jsonb_array_elements(NEW.menu_data)
            LOOP
                sort_cat := sort_cat + 1;

                INSERT INTO menu_categories (restaurant_id, name, sort_order)
                VALUES (new_restaurant_id, cat->>'name', sort_cat)
                RETURNING id INTO new_category_id;

                sort_item := 0;
                FOR item IN SELECT * FROM jsonb_array_elements(cat->'items')
                LOOP
                    sort_item := sort_item + 1;
                    INSERT INTO menu_items (
                        restaurant_id, category_id, name, description, price,
                        image_url, is_available, sort_order
                    ) VALUES (
                        new_restaurant_id,
                        new_category_id,
                        item->>'name',
                        NULLIF(item->>'description', ''),
                        (item->>'price')::INTEGER,
                        NULLIF(item->>'image_url', ''),
                        TRUE,
                        sort_item
                    );
                END LOOP;
            END LOOP;
        END IF;

    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_saloon_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_saloon_id UUID;
    cat           JSONB;
    item          JSONB;
    sort_i        INTEGER;
    staff_i       INTEGER;
BEGIN

    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN

        INSERT INTO saloons (
            name, description, category, address, phone, lat, lng,
            cover_image_url, youtube_url, hours, tags, is_open, is_vip, status
        )
        VALUES (
            NEW.name, NEW.description, COALESCE(NEW.category,'Barbershop'),
            NEW.address, NEW.phone, NEW.lat, NEW.lng,
            NEW.cover_image_url, NEW.youtube_url,
            CASE
                WHEN NEW.hours IS NOT NULL THEN
                    jsonb_build_object(
                        'mon',NEW.hours,'tue',NEW.hours,'wed',NEW.hours,
                        'thu',NEW.hours,'fri',NEW.hours,'sat',NEW.hours,'sun',NEW.hours
                    )
                ELSE NULL
            END,
            COALESCE(NEW.tags,'{}'),
            FALSE, FALSE, 'approved'
        )
        RETURNING id INTO new_saloon_id;

        IF NEW.menu_data IS NOT NULL AND jsonb_array_length(NEW.menu_data) > 0 THEN
            FOR cat IN SELECT * FROM jsonb_array_elements(NEW.menu_data)
            LOOP
                sort_i := 0;
                FOR item IN SELECT * FROM jsonb_array_elements(cat->'items')
                LOOP
                    sort_i := sort_i + 1;
                    INSERT INTO saloon_services (
                        saloon_id, category, name, description, price, duration, is_available, sort_order
                    )
                    VALUES (
                        new_saloon_id, cat->>'name', item->>'name',
                        NULLIF(item->>'description',''),
                        (item->>'price')::INTEGER,
                        NULLIF(item->>'duration','')::INTEGER,
                        TRUE, sort_i
                    );
                END LOOP;
            END LOOP;
        END IF;

        IF NEW.staff_data IS NOT NULL AND jsonb_array_length(NEW.staff_data) > 0 THEN
            staff_i := 0;
            FOR item IN SELECT * FROM jsonb_array_elements(NEW.staff_data)
            LOOP
                staff_i := staff_i + 1;
                INSERT INTO saloon_staff (saloon_id, name, role, photo_url, sort_order)
                VALUES (new_saloon_id, item->>'name', item->>'role', item->>'photo_url', staff_i);
            END LOOP;
        END IF;

    END IF;

    RETURN NEW;

END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_wellness_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_center_id UUID;
    cat           JSONB;
    item          JSONB;
    sort_i        INTEGER := 0;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO wellness_centers (name, description, category, address, phone, lat, lng,
            cover_image_url, youtube_url, hours, tags, is_open, is_vip, status)
        VALUES (NEW.name, NEW.description, COALESCE(NEW.category,'Massage'),
            NEW.address, NEW.phone, NEW.lat, NEW.lng,
            NEW.cover_image_url, NEW.youtube_url,
            CASE WHEN NEW.hours IS NOT NULL THEN
                jsonb_build_object('mon',NEW.hours,'tue',NEW.hours,'wed',NEW.hours,
                    'thu',NEW.hours,'fri',NEW.hours,'sat',NEW.hours,'sun',NEW.hours)
            ELSE NULL END,
            COALESCE(NEW.tags,'{}'), FALSE, FALSE, 'approved')
        RETURNING id INTO new_center_id;

        IF NEW.menu_data IS NOT NULL AND jsonb_array_length(NEW.menu_data) > 0 THEN
            FOR cat IN SELECT * FROM jsonb_array_elements(NEW.menu_data) LOOP
                sort_i := 0;
                FOR item IN SELECT * FROM jsonb_array_elements(cat->'items') LOOP
                    sort_i := sort_i + 1;
                    INSERT INTO wellness_services (center_id, category, name, description, price, duration, is_available, sort_order)
                    VALUES (new_center_id, cat->>'name', item->>'name',
                        NULLIF(item->>'description',''),
                        (item->>'price')::INTEGER,
                        NULLIF(item->>'duration','')::INTEGER,
                        TRUE, sort_i);
                END LOOP;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

