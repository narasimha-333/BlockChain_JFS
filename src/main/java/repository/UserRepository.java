package com.securepayments.repository;

import com.securepayments.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query; // Needed for the specific query style
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // FIX: Renamed method to a standard structure (ById) and rely ONLY on @Lock
    // to apply PESSIMISTIC_WRITE. This solves the "No property 'withLock' found" error.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = ?1") // Use JQPL to ensure correct query execution with Lock
    Optional<User> findLockedById(Long id);

    // This method is correctly defined, used by TransactionService
    Optional<User> findById(Long id);
}
