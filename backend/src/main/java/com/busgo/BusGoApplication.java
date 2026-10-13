package com.busgo;

import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class BusGoApplication {

    private static final Logger log = LoggerFactory.getLogger(BusGoApplication.class);

    public static void main(String[] args) {
        // Safe .env loader: search current directory, parent directory, and root workspace
        loadDotenvSafely();

        // Default business timezone: Asia/Kolkata
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));

        SpringApplication.run(BusGoApplication.class, args);
        log.info("BusGo Application successfully started in Asia/Kolkata timezone.");
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
