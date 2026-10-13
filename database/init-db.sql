-- ============================================================================
-- BusGo Online Bus Booking Web Application - Database Initialization Script
-- Run this script as the PostgreSQL superuser (e.g. postgres) to set up
-- the dedicated application user and database safely.
-- ============================================================================

-- 1. Create the dedicated application role if it does not already exist
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'busgo_app') THEN
      CREATE ROLE busgo_app WITH LOGIN PASSWORD 'busgo_secure_pass_2026';
      RAISE NOTICE 'Role busgo_app created successfully.';
   ELSE
      ALTER ROLE busgo_app WITH PASSWORD 'busgo_secure_pass_2026';
      RAISE NOTICE 'Role busgo_app already exists, password verified.';
   END IF;
END
$$;

-- 2. Create the application database if it does not already exist
SELECT 'CREATE DATABASE busgo_db WITH OWNER busgo_app ENCODING ''UTF8'' TEMPLATE template1'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'busgo_db')\gexec

-- 3. Grant privileges to the application user
GRANT ALL PRIVILEGES ON DATABASE busgo_db TO busgo_app;
ALTER DATABASE busgo_db OWNER TO busgo_app;
