package com.busgo.repository;

import com.busgo.entity.BusSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusSeatRepository extends JpaRepository<BusSeat, Long> {
    List<BusSeat> findByBusId(Long busId);
    List<BusSeat> findByBusIdAndActiveTrueOrderByRowNumberAscColumnNumberAsc(Long busId);
    Optional<BusSeat> findByBusIdAndSeatNumber(Long busId, String seatNumber);
    long countByBusIdAndActiveTrue(Long busId);
}
