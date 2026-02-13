package com.securepayments.repository;

import com.securepayments.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface TransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    /**
     * Finds all transactions, eagerly fetching sender, receiver, and block.
     * FIX: Added DISTINCT to prevent duplicate parent rows (Cartesian Product)
     * when multiple child entities (which is indirectly happening here) are joined.
     */
    @Query("SELECT DISTINCT pt FROM PaymentTransaction pt " +
            "LEFT JOIN FETCH pt.sender s " +
            "LEFT JOIN FETCH pt.receiver r " +
            "LEFT JOIN FETCH pt.block b")
    List<PaymentTransaction> findAllEagerly();

    /**
     * Finds all pending transactions, eagerly fetching sender and receiver.
     * FIX: Added DISTINCT for safety, preventing duplication during processing.
     */
    @Query("SELECT DISTINCT pt FROM PaymentTransaction pt " +
            "LEFT JOIN FETCH pt.sender s " +
            "LEFT JOIN FETCH pt.receiver r " +
            "WHERE pt.block IS NULL")
    List<PaymentTransaction> findByBlockIsNullEagerly();


    /**
     * Finds all transactions that have not yet been included in a block (i.e., are PENDING).
     */
    List<PaymentTransaction> findByBlockIsNull();

    /**
     * Deletes all transactions where the given ID is either the sender or the receiver.
     */
    @Transactional
    void deleteBySenderIdOrReceiverId(Long senderId, Long receiverId);
}