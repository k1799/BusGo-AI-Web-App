package com.busgo.repository;

import com.busgo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.phoneNumber = :rawPhone OR u.phoneNumber = :canonicalPhone OR u.phoneNumber = :tenDigit")
    boolean existsByPhoneVariants(
            @Param("rawPhone") String rawPhone,
            @Param("canonicalPhone") String canonicalPhone,
            @Param("tenDigit") String tenDigit);
}
