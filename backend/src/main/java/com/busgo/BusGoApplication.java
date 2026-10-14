package com.busgo;

import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;
import java.net.URI;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class BusGoApplication {

    private static final Logger log = LoggerFactory.getLogger(BusGoApplication.class);

    public static void main(String[] args) {
        // Safe .env loader: search current directory, parent directory, and root workspace
        loadDotenvSafely();

        // Auto-configure cloud/Railway database environment variables if present
        configureDatabaseEnvironment();

        // Default business timezone: Asia/Kolkata
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));

        SpringApplication.run(BusGoApplication.class, args);
        log.info("BusGo Application successfully started in Asia/Kolkata timezone.");
    }

    /**
     * Translates standard Railway / cloud PostgreSQL environment variables (DATABASE_URL,
     * PGHOST, etc.) into Spring Boot JDBC datasource properties so the application can connect
     * out of the box without requiring manual JDBC URL formatting.
     */
    private static void configureDatabaseEnvironment() {
        String dbUrl = System.getenv("DATABASE_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getenv("DATABASE_PUBLIC_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getenv("DB_URL");
        }

        if (dbUrl != null && !dbUrl.isBlank()) {
            try {
                if (dbUrl.startsWith("jdbc:postgresql://")) {
                    System.setProperty("spring.datasource.url", dbUrl);
                } else if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
                    URI uri = new URI(dbUrl.replace("postgres://", "postgresql://"));
                    String userInfo = uri.getUserInfo();
                    String host = uri.getHost();
                    int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                    String path = uri.getPath();
                    String query = uri.getQuery();

                    String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + (query != null ? "?" + query : "");
                    System.setProperty("spring.datasource.url", jdbcUrl);

                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        System.setProperty("spring.datasource.username", parts[0]);
                        System.setProperty("spring.datasource.password", parts[1]);
                    }
                    log.info("Auto-configured Spring datasource from DATABASE_URL -> host={}:{}", host, port);
                }
            } catch (Exception e) {
                log.error("Failed to parse DATABASE_URL: {}. Falling back to standard configuration.", e.getMessage());
            }
        } else if (System.getenv("PGHOST") != null) {
            String host = System.getenv("PGHOST");
            String port = System.getenv("PGPORT") != null ? System.getenv("PGPORT") : "5432";
            String database = System.getenv("PGDATABASE") != null ? System.getenv("PGDATABASE") : "railway";
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database;
            System.setProperty("spring.datasource.url", jdbcUrl);

            if (System.getenv("PGUSER") != null) {
                System.setProperty("spring.datasource.username", System.getenv("PGUSER"));
            }
            if (System.getenv("PGPASSWORD") != null) {
                System.setProperty("spring.datasource.password", System.getenv("PGPASSWORD"));
            }
            log.info("Auto-configured Spring datasource from PGHOST -> {}", jdbcUrl);
        }
    }

    private static void loadDotenvSafely() {
        try {
            // Check current dir or parent dir
            File envFile = new File(".env");
            File parentEnvFile = new File("../.env");
            String dirToUse = null;

            if (envFile.exists()) {
                dirToUse = ".";
            } else if (parentEnvFile.exists()) {
                dirToUse = "..";
            }

            if (dirToUse != null) {
                Dotenv dotenv = Dotenv.configure()
                        .directory(dirToUse)
                        .ignoreIfMissing()
                        .load();

                dotenv.entries().forEach(entry -> {
                    if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
                });
                log.info("Loaded environment variables from: {}/.env", dirToUse);
            } else {
                log.info("No .env file found in working directory or parent. Using system environment variables.");
            }
        } catch (Exception e) {
            log.warn("Failed to load .env file: {}. Continuing with system environment.", e.getMessage());
        }
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
    }
}
