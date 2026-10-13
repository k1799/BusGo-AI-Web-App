-- ============================================================================
-- BusGo Online Bus Booking Web Application
-- Flyway Migration: V1__init_schema.sql
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'ROLE_CUSTOMER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Buses Table
CREATE TABLE IF NOT EXISTS buses (
    id BIGSERIAL PRIMARY KEY,
    bus_name VARCHAR(120) NOT NULL,
    registration_number VARCHAR(40) NOT NULL UNIQUE,
    bus_type VARCHAR(60) NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    layout_type VARCHAR(40) NOT NULL DEFAULT '2+2_SEATER',
    amenities TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buses_active ON buses(is_active);

-- 3. Bus Seats Table
CREATE TABLE IF NOT EXISTS bus_seats (
    id BIGSERIAL PRIMARY KEY,
    bus_id BIGINT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    seat_type VARCHAR(30) NOT NULL DEFAULT 'SEATER',
    deck VARCHAR(20) NOT NULL DEFAULT 'LOWER',
    row_number INT NOT NULL,
    column_number INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_bus_seat UNIQUE (bus_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_bus_seats_bus_id ON bus_seats(bus_id);

-- 4. Routes Table
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    boarding_point VARCHAR(160) NOT NULL,
    dropping_point VARCHAR(160) NOT NULL,
    distance_km NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    estimated_duration_minutes INT NOT NULL CHECK (estimated_duration_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_endpoints UNIQUE (origin_city, destination_city, boarding_point, dropping_point)
);

CREATE INDEX IF NOT EXISTS idx_routes_cities ON routes(origin_city, destination_city);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);

-- 5. Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id BIGSERIAL PRIMARY KEY,
    driver_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    license_number VARCHAR(60) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);

-- 6. Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id BIGSERIAL PRIMARY KEY,
    bus_id BIGINT NOT NULL REFERENCES buses(id),
    route_id BIGINT NOT NULL REFERENCES routes(id),
    driver_id BIGINT REFERENCES drivers(id),
    journey_date DATE NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
    base_fare NUMERIC(10,2) NOT NULL CHECK (base_fare >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_schedule_times CHECK (arrival_time > departure_time)
);

CREATE INDEX IF NOT EXISTS idx_schedules_search ON schedules(route_id, journey_date, status);
CREATE INDEX IF NOT EXISTS idx_schedules_departure ON schedules(departure_time, status);
CREATE INDEX IF NOT EXISTS idx_schedules_bus ON schedules(bus_id, departure_time, arrival_time);

-- 7. Seat Holds Table
CREATE TABLE IF NOT EXISTS seat_holds (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES bus_seats(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hold_token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_active ON seat_holds(schedule_id, seat_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_holds_token ON seat_holds(hold_token);

-- 8. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_reference VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    schedule_id BIGINT NOT NULL REFERENCES schedules(id),
    total_seats INT NOT NULL CHECK (total_seats > 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    booking_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    cancellation_reason VARCHAR(255),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings(schedule_id, booking_status);

-- 9. Booking Passengers Table
CREATE TABLE IF NOT EXISTS booking_passengers (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES bus_seats(id),
    seat_number VARCHAR(10) NOT NULL,
    passenger_name VARCHAR(120) NOT NULL,
    passenger_age INT NOT NULL CHECK (passenger_age >= 1 AND passenger_age <= 125),
    passenger_gender VARCHAR(20) NOT NULL,
    contact_number VARCHAR(20),
    fare NUMERIC(10,2) NOT NULL CHECK (fare >= 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking ON booking_passengers(booking_id);

-- 10. Booking Seats Table
CREATE TABLE IF NOT EXISTS booking_seats (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES bus_seats(id),
    seat_number VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_schedule_seat
    ON booking_seats (schedule_id, seat_id)
    WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_booking_seats_schedule ON booking_seats(schedule_id, status);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    payment_order_id VARCHAR(100) NOT NULL,
    payment_transaction_id VARCHAR(100),
    provider VARCHAR(40) NOT NULL DEFAULT 'DEMO',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    provider_signature VARCHAR(255),
    failure_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx ON payments(payment_transaction_id);

-- 12. Cancellations and Refunds Table
CREATE TABLE IF NOT EXISTS cancellations_refunds (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    payment_id BIGINT REFERENCES payments(id),
    cancellation_reference VARCHAR(50) NOT NULL UNIQUE,
    refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cancellation_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    refund_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(255),
    processed_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_booking ON cancellations_refunds(booking_id);

-- 13. Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL REFERENCES schedules(id),
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    booking_id BIGINT REFERENCES bookings(id),
    notification_type VARCHAR(40) NOT NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    message_payload TEXT NOT NULL,
    provider VARCHAR(40) NOT NULL DEFAULT 'MOCK',
    provider_message_id VARCHAR(100),
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_schedule ON notification_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notification_logs(delivery_status, scheduled_for);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(60),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
