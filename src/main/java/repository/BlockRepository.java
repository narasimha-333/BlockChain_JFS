package com.securepayments.repository;

import com.securepayments.model.Block;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query; // <-- New Import
import org.springframework.stereotype.Repository;

import java.util.List; // <-- New Import

@Repository
public interface BlockRepository extends JpaRepository<Block, Long> {

    /**
     * Finds all Blocks, eagerly fetching their associated PaymentTransactions,
     * sorted by blockIndex. This avoids N+1 queries when fetching the blockchain.
     */
    @Query("SELECT b FROM Block b LEFT JOIN FETCH b.transactions t ORDER BY b.blockIndex")
    List<Block> findAllWithTransactions();

    // Returns the latest block by blockIndex
    Block findTopByOrderByBlockIndexDesc();
}