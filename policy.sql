-- ── POLICIES ──────────────────────────────────────────────────────

CREATE POLICY "public_read_books" ON books FOR SELECT USING (true);

CREATE POLICY "public_read_dictionary" ON dictionary_entries FOR SELECT USING (true);

CREATE POLICY "public insert funeral_applications" ON funeral_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "public read funeral_providers" ON funeral_providers FOR SELECT USING ((status = 'approved'::text));

CREATE POLICY "public insert funeral_reviews" ON funeral_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "public read funeral_reviews" ON funeral_reviews FOR SELECT USING (true);

CREATE POLICY "public read funeral_services" ON funeral_services FOR SELECT USING (true);

CREATE POLICY "public_read_categories" ON menu_categories FOR SELECT USING ((EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = menu_categories.restaurant_id) AND (r.status = 'approved'::text)))));

CREATE POLICY "public_read_items" ON menu_items FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = menu_items.restaurant_id) AND (r.status = 'approved'::text))))));

CREATE POLICY "public_insert_merchant" ON merchant_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "public_insert_orders" ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_restaurants" ON restaurants FOR SELECT USING ((status = 'approved'::text));

CREATE POLICY "public_insert_reviews" ON reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_reviews" ON reviews FOR SELECT USING (true);

CREATE POLICY "public_insert_sal_app" ON saloon_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "public_insert_sal_review" ON saloon_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_sal_reviews" ON saloon_reviews FOR SELECT USING (true);

CREATE POLICY "public_read_sal_services" ON saloon_services FOR SELECT USING ((EXISTS ( SELECT 1
   FROM saloons s
  WHERE ((s.id = saloon_services.saloon_id) AND (s.status = 'approved'::text)))));

CREATE POLICY "public_read_sal_staff" ON saloon_staff FOR SELECT USING ((EXISTS ( SELECT 1
   FROM saloons s
  WHERE ((s.id = saloon_staff.saloon_id) AND (s.status = 'approved'::text)))));

CREATE POLICY "public_read_saloons" ON saloons FOR SELECT USING ((status = 'approved'::text));

CREATE POLICY "public_insert_wel_app" ON wellness_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_wellness" ON wellness_centers FOR SELECT USING ((status = 'approved'::text));

CREATE POLICY "public_insert_wel_review" ON wellness_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_wel_reviews" ON wellness_reviews FOR SELECT USING (true);

CREATE POLICY "public_read_wel_services" ON wellness_services FOR SELECT USING ((EXISTS ( SELECT 1
   FROM wellness_centers w
  WHERE ((w.id = wellness_services.center_id) AND (w.status = 'approved'::text)))));

