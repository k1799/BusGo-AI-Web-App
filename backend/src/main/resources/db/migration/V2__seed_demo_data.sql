-- ============================================================================
-- BusGo Online Bus Booking Web Application
-- Flyway Migration: V2__seed_demo_data.sql
-- Demonstration Data for initial 3 buses, routes, drivers, and users
-- ============================================================================

-- 1. Initial Users
INSERT INTO users (full_name, email, phone_number, password_hash, role, is_active)
VALUES 
('BusGo Administrator', 'admin@busgo.com', '+919999900001', '$2a$10$vN4.t6Ksmq9g2lO7v93LCOQxS0zEwG9z.Z8u2q2kZ4H3Y5W6Y7rSa', 'ROLE_ADMIN', TRUE),
('Ravi Kumar', 'customer@busgo.com', '+919888800002', '$2a$10$Y1KqM1F5A6h/F0lZ8E1zEO3w6zF8v0s9K0a1b2c3d4e5f6g7h8i9j', 'ROLE_CUSTOMER', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. Initial Buses
INSERT INTO buses (bus_name, registration_number, bus_type, total_seats, layout_type, amenities, is_active)
VALUES
('BusGo Royal Sleeper', 'TN-58-BG-1001', 'AC Sleeper (2+1)', 30, '2+1_SLEEPER', 'AC,Personal Charging Port,Reading Light,Water Bottle,Blanket & Pillow,GPS Live Tracking', TRUE),
('BusGo Express Seater', 'TN-58-BG-1002', 'AC Seater (2+2)', 40, '2+2_SEATER', 'AC,USB Charging,Pushback Seats,Reading Light,Emergency Exit,GPS Live Tracking', TRUE),
('BusGo Classic Semi-Sleeper', 'TN-58-BG-1003', 'Non-AC Seater (2+2)', 36, '2+2_SEATER', 'Pushback Seats,Emergency Exit,First Aid Box,Fire Extinguisher,GPS Live Tracking', TRUE)
ON CONFLICT (registration_number) DO NOTHING;

-- 3. Initial Drivers
INSERT INTO drivers (driver_name, phone_number, whatsapp_number, license_number, is_active)
VALUES
('Murugan K', '+919876543210', '+919876543210', 'DL-TN58-20150001234', TRUE),
('Senthil Nathan', '+919842154321', '+919842154321', 'DL-TN59-20170005678', TRUE),
('Rajendran P', '+919750012345', '+919750012345', 'DL-TN38-20140009876', TRUE)
ON CONFLICT (license_number) DO NOTHING;

-- 4. Initial Routes
INSERT INTO routes (origin_city, destination_city, boarding_point, dropping_point, distance_km, estimated_duration_minutes, is_active)
VALUES
('Madurai', 'Chennai', 'Mattuthavani Integrated Bus Terminus, Madurai', 'Kilambakkam Bus Terminus (KCBT), Chennai', 460.00, 480, TRUE),
('Chennai', 'Madurai', 'Kilambakkam Bus Terminus (KCBT), Chennai', 'Mattuthavani Integrated Bus Terminus, Madurai', 460.00, 480, TRUE),
('Coimbatore', 'Madurai', 'Gandhipuram Central Bus Stand, Coimbatore', 'Mattuthavani Integrated Bus Terminus, Madurai', 215.00, 270, TRUE)
ON CONFLICT (origin_city, destination_city, boarding_point, dropping_point) DO NOTHING;

-- 5. Generate Seats for Bus 1
DO $$
DECLARE
    v_bus_id BIGINT;
    r INT;
BEGIN
    SELECT id INTO v_bus_id FROM buses WHERE registration_number = 'TN-58-BG-1001';
    IF v_bus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bus_seats WHERE bus_id = v_bus_id) THEN
        FOR r IN 1..5 LOOP
            INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
            VALUES (v_bus_id, 'L' || ((r-1)*3 + 1), 'SLEEPER_LOWER', 'LOWER', r, 1, TRUE);
            INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
            VALUES (v_bus_id, 'L' || ((r-1)*3 + 2), 'SLEEPER_LOWER', 'LOWER', r, 3, TRUE);
            INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
            VALUES (v_bus_id, 'L' || ((r-1)*3 + 3), 'SLEEPER_LOWER', 'LOWER', r, 4, TRUE);

            INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
            VALUES (v_bus_id, 'U' || ((r-1)*3 + 1), 'SLEEPER_UPPER', 'UPPER', r, 1, TRUE);
            INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
            VALUES (v_bus_id, 'U' || ((r-1)*3 + 2), 'SLEEPER_UPPER', 'UPPER', r, 3, TRUE);
            INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
            VALUES (v_bus_id, 'U' || ((r-1)*3 + 3), 'SLEEPER_UPPER', 'UPPER', r, 4, TRUE);
        END LOOP;
    END IF;
END $$;

-- 6. Generate Seats for Bus 2
DO $$
DECLARE
    v_bus_id BIGINT;
    r INT;
    c INT;
    s_idx INT := 1;
BEGIN
    SELECT id INTO v_bus_id FROM buses WHERE registration_number = 'TN-58-BG-1002';
    IF v_bus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bus_seats WHERE bus_id = v_bus_id) THEN
        FOR r IN 1..10 LOOP
            FOR c IN 1..4 LOOP
                INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                VALUES (v_bus_id, 'S' || s_idx, 'SEATER', 'LOWER', r, c, TRUE);
                s_idx := s_idx + 1;
            END LOOP;
        END LOOP;
    END IF;
END $$;

-- 7. Generate Seats for Bus 3
DO $$
DECLARE
    v_bus_id BIGINT;
    r INT;
    c INT;
    s_idx INT := 1;
BEGIN
    SELECT id INTO v_bus_id FROM buses WHERE registration_number = 'TN-58-BG-1003';
    IF v_bus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bus_seats WHERE bus_id = v_bus_id) THEN
        FOR r IN 1..9 LOOP
            FOR c IN 1..4 LOOP
                INSERT INTO bus_seats (bus_id, seat_number, seat_type, deck, row_number, column_number, is_active)
                VALUES (v_bus_id, 'S' || s_idx, 'SEATER', 'LOWER', r, c, TRUE);
                s_idx := s_idx + 1;
            END LOOP;
        END LOOP;
    END IF;
END $$;

-- 8. Seed Schedules for the Next 7 Days
DO $$
DECLARE
    v_bus1 BIGINT;
    v_bus2 BIGINT;
    v_bus3 BIGINT;
    v_route1 BIGINT;
    v_route2 BIGINT;
    v_route3 BIGINT;
    v_driver1 BIGINT;
    v_driver2 BIGINT;
    v_driver3 BIGINT;
    d_offset INT;
    target_date DATE;
BEGIN
    SELECT id INTO v_bus1 FROM buses WHERE registration_number = 'TN-58-BG-1001';
    SELECT id INTO v_bus2 FROM buses WHERE registration_number = 'TN-58-BG-1002';
    SELECT id INTO v_bus3 FROM buses WHERE registration_number = 'TN-58-BG-1003';

    SELECT id INTO v_route1 FROM routes WHERE origin_city = 'Madurai' AND destination_city = 'Chennai';
    SELECT id INTO v_route2 FROM routes WHERE origin_city = 'Chennai' AND destination_city = 'Madurai';
    SELECT id INTO v_route3 FROM routes WHERE origin_city = 'Coimbatore' AND destination_city = 'Madurai';

    SELECT id INTO v_driver1 FROM drivers WHERE phone_number = '+919876543210';
    SELECT id INTO v_driver2 FROM drivers WHERE phone_number = '+919842154321';
    SELECT id INTO v_driver3 FROM drivers WHERE phone_number = '+919750012345';

    FOR d_offset IN 0..6 LOOP
        target_date := CURRENT_DATE + d_offset;

        IF NOT EXISTS (SELECT 1 FROM schedules WHERE bus_id = v_bus1 AND journey_date = target_date) THEN
            INSERT INTO schedules (bus_id, route_id, driver_id, journey_date, departure_time, arrival_time, base_fare, status)
            VALUES (
                v_bus1,
                v_route1,
                v_driver1,
                target_date,
                (target_date + TIME '21:00:00') AT TIME ZONE 'Asia/Kolkata',
                (target_date + INTERVAL '1 day' + TIME '05:00:00') AT TIME ZONE 'Asia/Kolkata',
                950.00,
                'ACTIVE'
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM schedules WHERE bus_id = v_bus2 AND journey_date = target_date) THEN
            INSERT INTO schedules (bus_id, route_id, driver_id, journey_date, departure_time, arrival_time, base_fare, status)
            VALUES (
                v_bus2,
                v_route2,
                v_driver2,
                target_date,
                (target_date + TIME '20:30:00') AT TIME ZONE 'Asia/Kolkata',
                (target_date + INTERVAL '1 day' + TIME '04:30:00') AT TIME ZONE 'Asia/Kolkata',
                650.00,
                'ACTIVE'
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM schedules WHERE bus_id = v_bus3 AND journey_date = target_date) THEN
            INSERT INTO schedules (bus_id, route_id, driver_id, journey_date, departure_time, arrival_time, base_fare, status)
            VALUES (
                v_bus3,
                v_route3,
                v_driver3,
                target_date,
                (target_date + TIME '17:00:00') AT TIME ZONE 'Asia/Kolkata',
                (target_date + TIME '21:30:00') AT TIME ZONE 'Asia/Kolkata',
                420.00,
                'ACTIVE'
            );
        END IF;
    END LOOP;
END $$;
