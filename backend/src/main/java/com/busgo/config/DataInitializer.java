package com.busgo.config;

import com.busgo.entity.Role;
import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_number ON users(phone_number)");
        } catch (Exception e) {
            log.warn("Could not create uq_users_phone_number index: {}", e.getMessage());
        }
        // Ensure default Admin user exists and has valid BCrypt hash
        userRepository.findByEmail("admin@busgo.com").ifPresentOrElse(
                admin -> {
                    // Refresh password to ensure it matches Admin@BusGo2026
                    admin.setPasswordHash(passwordEncoder.encode("Admin@BusGo2026"));
                    admin.setRole(Role.ROLE_ADMIN);
                    admin.setActive(true);
                    userRepository.save(admin);
                    log.info("Admin user verified: admin@busgo.com");
                },
                () -> {
                    User admin = new User(
                            "BusGo Administrator",
                            "admin@busgo.com",
                            "+919999900001",
                            passwordEncoder.encode("Admin@BusGo2026"),
                            Role.ROLE_ADMIN
                    );
                    userRepository.save(admin);
                    log.info("Admin user created: admin@busgo.com");
                }
        );

        // Ensure default Customer user exists and has valid BCrypt hash
        userRepository.findByEmail("customer@busgo.com").ifPresentOrElse(
                customer -> {
                    customer.setPasswordHash(passwordEncoder.encode("Customer@2026"));
                    customer.setRole(Role.ROLE_CUSTOMER);
                    customer.setActive(true);
                    userRepository.save(customer);
                    log.info("Customer user verified: customer@busgo.com");
                },
                () -> {
                    User customer = new User(
                            "Ravi Kumar",
                            "customer@busgo.com",
                            "+919888800002",
                            passwordEncoder.encode("Customer@2026"),
                            Role.ROLE_CUSTOMER
                    );
                    userRepository.save(customer);
                    log.info("Customer user created: customer@busgo.com");
                }
        );
    }
}
