-- ==============================================================================
-- BusGo — Repeatable, Duplicate-Safe Demo Seed Script for Routes, Buses & Schedules
-- Preserves all existing buses, routes, drivers, schedules, bookings, and users.
-- Timezone: Asia/Kolkata (+05:30)
-- ==============================================================================

BEGIN;

SET TIME ZONE 'Asia/Kolkata';

-- ------------------------------------------------------------------------------
-- 1. Add Demo Buses (Duplicate-Safe via registration_number check)
-- ------------------------------------------------------------------------------
INSERT INTO buses (bus_name, registration_number, bus_type, total_seats, layout_type, amenities, is_active)
SELECT v.bus_name, v.registration_number, v.bus_type, v.total_seats, v.layout_type, v.amenities, TRUE
FROM (VALUES
    ('BusGo Pandian AC Sleeper',      'TN-58-BG-1004', 'SLEEPER_AC',    30, '2+1_SLEEPER', 'AC,WiFi,Blanket,Charging Point,Live GPS,Reading Light'),
    ('BusGo Vaigai AC Seater',        'TN-01-BG-2005', 'SEATER_AC',     40, '2+2_SEATER',  'AC,Charging Point,Water Bottle,Live GPS,Pushback Seats'),
    ('BusGo Kongu Sleeper Coach',     'TN-38-BG-3006', 'SLEEPER_AC',    30, '2+1_SLEEPER', 'AC,WiFi,Blanket,Charging Point,Live GPS'),
    ('BusGo Deccan Multi-Axle',       'KA-01-BG-4007', 'SLEEPER_AC',    30, '2+1_SLEEPER', 'AC,WiFi,Blanket,Pillow,Charging Point,Live GPS'),
    ('BusGo Cauvery Fast Seater',     'TN-45-BG-5008', 'SEATER_AC',     40, '2+2_SEATER',  'AC,Charging Point,Live GPS,Reading Light'),
    ('BusGo Economy Non-AC Seater',   'TN-58-BG-6009', 'SEATER_NON_AC', 36, '2+2_SEATER',  'Charging Point,Reading Light,Emergency Exit,Live GPS')
) AS v(bus_name, registration_number, bus_type, total_seats, layout_type, amenities)
WHERE NOT EXISTS (
    SELECT 1 FROM buses b WHERE b.registration_number = v.registration_number
);

-- ------------------------------------------------------------------------------
-- 2. Auto-Generate Seat Layouts in bus_seats for Any Bus Missing Seats
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    b RECORD;
    berths_per_deck INT;
    num_rows INT;
    r INT;
    c INT;
    seat_cnt INT;
BEGIN
    FOR b IN
        SELECT id, total_seats, layout_type
        FROM buses
        WHERE NOT EXISTS (SELECT 1 FROM bus_seats bs WHERE bs.bus_id = buses.id)
    LOOP
        IF UPPER(b.layout_type) = '2+1_SLEEPER' THEN
            berths_per_deck := b.total_seats / 2;
            num_rows := CEIL(berths_per_deck::NUMERIC / 3.0);

            -- Lower Deck (L1..L15)
            seat_cnt := 1;
            FOR r IN 1..num_rows LOOP
                IF seat_cnt <= berths_per_deck THEN
                    INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                    VALUES (b.id, 'L' || seat_cnt, 'SLEEPER_LOWER', 'LOWER', r, 1, TRUE)
                    ON CONFLICT (bus_id, seat_number) DO NOTHING;
                    seat_cnt := seat_cnt + 1;
                END IF;
                IF seat_cnt <= berths_per_deck THEN
                    INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                    VALUES (b.id, 'L' || seat_cnt, 'SLEEPER_LOWER', 'LOWER', r, 3, TRUE)
                    ON CONFLICT (bus_id, seat_number) DO NOTHING;
                    seat_cnt := seat_cnt + 1;
                END IF;
                IF seat_cnt <= berths_per_deck THEN
                    INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                    VALUES (b.id, 'L' || seat_cnt, 'SLEEPER_LOWER', 'LOWER', r, 4, TRUE)
                    ON CONFLICT (bus_id, seat_number) DO NOTHING;
                    seat_cnt := seat_cnt + 1;
                END IF;
            END LOOP;

            -- Upper Deck (U1..U15)
            seat_cnt := 1;
            FOR r IN 1..num_rows LOOP
                IF seat_cnt <= berths_per_deck THEN
                    INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                    VALUES (b.id, 'U' || seat_cnt, 'SLEEPER_UPPER', 'UPPER', r, 1, TRUE)
                    ON CONFLICT (bus_id, seat_number) DO NOTHING;
                    seat_cnt := seat_cnt + 1;
                END IF;
                IF seat_cnt <= berths_per_deck THEN
                    INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                    VALUES (b.id, 'U' || seat_cnt, 'SLEEPER_UPPER', 'UPPER', r, 3, TRUE)
                    ON CONFLICT (bus_id, seat_number) DO NOTHING;
                    seat_cnt := seat_cnt + 1;
                END IF;
                IF seat_cnt <= berths_per_deck THEN
                    INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                    VALUES (b.id, 'U' || seat_cnt, 'SLEEPER_UPPER', 'UPPER', r, 4, TRUE)
                    ON CONFLICT (bus_id, seat_number) DO NOTHING;
                    seat_cnt := seat_cnt + 1;
                END IF;
            END LOOP;
        ELSE
            -- 2+2 Seater (S1..S40 / S36)
            num_rows := CEIL(b.total_seats::NUMERIC / 4.0);
            seat_cnt := 1;
            FOR r IN 1..num_rows LOOP
                FOR c IN 1..4 LOOP
                    IF seat_cnt <= b.total_seats THEN
                        INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                        VALUES (b.id, 'S' || seat_cnt, 'SEATER', 'LOWER', r, c, TRUE)
                        ON CONFLICT (bus_id, seat_number) DO NOTHING;
                        seat_cnt := seat_cnt + 1;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Add Missing Corridor Routes (Duplicate-Safe via origin + destination check)
-- ------------------------------------------------------------------------------
INSERT INTO routes (origin_city, destination_city, boarding_point, dropping_point, distance_km, estimated_duration_minutes, is_active)
SELECT v.origin_city, v.destination_city, v.boarding_point, v.dropping_point, v.distance_km, v.estimated_duration_minutes, TRUE
FROM (VALUES
    ('Madurai',    'Chennai',    'Madurai Mattuthavani Bus Terminus',       'Chennai Kilambakkam Bus Terminus',        460.00, 450),
    ('Chennai',    'Madurai',    'Chennai Kilambakkam Bus Terminus',        'Madurai Mattuthavani Bus Terminus',       460.00, 450),
    ('Coimbatore', 'Madurai',    'Coimbatore Gandhipuram Bus Stand',        'Madurai Mattuthavani Bus Terminus',       215.00, 270),
    ('Madurai',    'Coimbatore', 'Madurai Mattuthavani Bus Terminus',       'Coimbatore Gandhipuram Bus Stand',        215.00, 270),
    ('Madurai',    'Bangalore',  'Madurai Mattuthavani Bus Terminus',       'Bangalore Majestic Kempegowda Terminus',  435.00, 440),
    ('Bangalore',  'Madurai',    'Bangalore Majestic Kempegowda Terminus',  'Madurai Mattuthavani Bus Terminus',       435.00, 440),
    ('Madurai',    'Trichy',     'Madurai Mattuthavani Bus Terminus',       'Trichy Central Bus Stand',                135.00, 150),
    ('Trichy',     'Madurai',    'Trichy Central Bus Stand',                'Madurai Mattuthavani Bus Terminus',       135.00, 150)
) AS v(origin_city, destination_city, boarding_point, dropping_point, distance_km, estimated_duration_minutes)
WHERE NOT EXISTS (
    SELECT 1 FROM routes r
    WHERE LOWER(r.origin_city) = LOWER(v.origin_city)
      AND LOWER(r.destination_city) = LOWER(v.destination_city)
);

-- ------------------------------------------------------------------------------
-- 4. Seed Demo Schedules for Today (CURRENT_DATE in Asia/Kolkata) & Upcoming 6 Days
--    - Preserves all existing schedules.
--    - For today: includes both past morning departures (to verify past departure filtering)
--      and multiple future afternoon/evening/night departures.
--    - For tomorrow and upcoming days: includes morning, afternoon, evening, and night departures.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    base_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
    day_offset INT;
    target_date DATE;
    rec RECORD;
    v_route_id BIGINT;
    v_duration_min INT;
    v_bus_id BIGINT;
    v_driver_id BIGINT;
    v_dep_ts TIMESTAMPTZ;
    v_arr_ts TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_driver_id FROM drivers WHERE is_active = TRUE ORDER BY id LIMIT 1;

    FOR day_offset IN 0..6 LOOP
        target_date := base_today + day_offset;

        FOR rec IN
            SELECT * FROM (VALUES
                -- 1. Madurai -> Chennai (Morning, Afternoon, Evening, Night)
                ('Madurai', 'Chennai', 'TN-58-BG-1002', '06:30:00', 650.00),
                ('Madurai', 'Chennai', 'TN-58-BG-6009', '09:15:00', 520.00),
                ('Madurai', 'Chennai', 'TN-01-BG-2005', '14:30:00', 680.00),
                ('Madurai', 'Chennai', 'TN-58-BG-1004', '18:00:00', 890.00),
                ('Madurai', 'Chennai', 'TN-58-BG-1001', '21:00:00', 850.00),
                ('Madurai', 'Chennai', 'TN-38-BG-3006', '22:30:00', 920.00),

                -- 2. Chennai -> Madurai (Morning, Afternoon, Evening, Night)
                ('Chennai', 'Madurai', 'TN-01-BG-2005', '06:00:00', 650.00),
                ('Chennai', 'Madurai', 'TN-58-BG-6009', '09:30:00', 520.00),
                ('Chennai', 'Madurai', 'TN-45-BG-5008', '15:00:00', 680.00),
                ('Chennai', 'Madurai', 'TN-58-BG-1004', '18:30:00', 880.00),
                ('Chennai', 'Madurai', 'TN-58-BG-1002', '20:30:00', 650.00),
                ('Chennai', 'Madurai', 'TN-58-BG-1001', '22:15:00', 890.00),

                -- 3. Coimbatore -> Madurai (Morning, Afternoon, Evening, Night)
                ('Coimbatore', 'Madurai', 'TN-58-BG-1003', '07:00:00', 420.00),
                ('Coimbatore', 'Madurai', 'TN-45-BG-5008', '13:30:00', 480.00),
                ('Coimbatore', 'Madurai', 'TN-58-BG-1003', '17:00:00', 420.00),
                ('Coimbatore', 'Madurai', 'TN-38-BG-3006', '21:30:00', 590.00),

                -- 4. Madurai -> Coimbatore (Morning, Afternoon, Evening, Night)
                ('Madurai', 'Coimbatore', 'TN-58-BG-1003', '06:45:00', 420.00),
                ('Madurai', 'Coimbatore', 'TN-01-BG-2005', '14:00:00', 480.00),
                ('Madurai', 'Coimbatore', 'TN-58-BG-6009', '17:30:00', 390.00),
                ('Madurai', 'Coimbatore', 'TN-38-BG-3006', '21:45:00', 580.00),

                -- 5. Madurai -> Bangalore (Morning, Afternoon, Night)
                ('Madurai', 'Bangalore', 'KA-01-BG-4007', '07:30:00', 950.00),
                ('Madurai', 'Bangalore', 'TN-01-BG-2005', '15:30:00', 780.00),
                ('Madurai', 'Bangalore', 'KA-01-BG-4007', '21:15:00', 980.00),

                -- 6. Bangalore -> Madurai (Morning, Afternoon, Night)
                ('Bangalore', 'Madurai', 'KA-01-BG-4007', '07:15:00', 950.00),
                ('Bangalore', 'Madurai', 'TN-45-BG-5008', '15:45:00', 780.00),
                ('Bangalore', 'Madurai', 'TN-58-BG-1004', '21:30:00', 960.00),

                -- 7. Madurai -> Trichy (Morning, Afternoon, Evening, Night)
                ('Madurai', 'Trichy', 'TN-45-BG-5008', '08:00:00', 260.00),
                ('Madurai', 'Trichy', 'TN-58-BG-6009', '13:15:00', 210.00),
                ('Madurai', 'Trichy', 'TN-45-BG-5008', '17:45:00', 260.00),
                ('Madurai', 'Trichy', 'TN-58-BG-1002', '21:00:00', 290.00),

                -- 8. Trichy -> Madurai (Morning, Afternoon, Evening, Night)
                ('Trichy', 'Madurai', 'TN-58-BG-6009', '08:15:00', 210.00),
                ('Trichy', 'Madurai', 'TN-45-BG-5008', '14:15:00', 260.00),
                ('Trichy', 'Madurai', 'TN-58-BG-6009', '18:15:00', 210.00),
                ('Trichy', 'Madurai', 'TN-45-BG-5008', '21:30:00', 260.00)
            ) AS t(origin_city, dest_city, reg_no, dep_time_str, fare)
        LOOP
            SELECT id, estimated_duration_minutes
              INTO v_route_id, v_duration_min
              FROM routes
             WHERE LOWER(origin_city) = LOWER(rec.origin_city)
               AND LOWER(destination_city) = LOWER(rec.dest_city)
             LIMIT 1;

            SELECT id INTO v_bus_id
              FROM buses
             WHERE registration_number = rec.reg_no
             LIMIT 1;

            IF v_route_id IS NOT NULL AND v_bus_id IS NOT NULL THEN
                v_dep_ts := ((target_date::TEXT || ' ' || rec.dep_time_str || '+05:30')::TIMESTAMPTZ);
                v_arr_ts := v_dep_ts + (v_duration_min || ' minutes')::INTERVAL;

                IF NOT EXISTS (
                    SELECT 1 FROM schedules s
                    WHERE s.route_id = v_route_id
                      AND s.journey_date = target_date
                      AND s.departure_time = v_dep_ts
                ) THEN
                    INSERT INTO schedules (
                        bus_id, route_id, driver_id, journey_date,
                        departure_time, arrival_time, base_fare, status
                    ) VALUES (
                        v_bus_id, v_route_id, v_driver_id, target_date,
                        v_dep_ts, v_arr_ts, rec.fare, 'ACTIVE'
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

COMMIT;
