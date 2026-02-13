package com.securepayments.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIgnore; // Added for good practice
import java.io.Serializable; // Added for good practice
import java.util.List;

@Entity
@Table(name = "blocks") // Good practice to explicitly name the table
public class Block implements Serializable {

    // --- Core Entity Fields ---
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private int blockIndex;

    @Column(nullable = false, length = 64) // Hashes are typically 64 chars (SHA-256)
    private String hash;

    @Column(nullable = false, length = 64)
    private String previousHash;

    @Column(updatable = false) // Timestamp shouldn't change after creation
    private long timestamp = System.currentTimeMillis();

    private int nonce;

    // --- Relationship ---
    @OneToMany(mappedBy = "block", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference // Correct use for the "one" side of the relationship
    private List<PaymentTransaction> transactions;

    // --- Constructors ---
    public Block() {}

    public Block(int blockIndex, String previousHash) {
        this.blockIndex = blockIndex;
        this.previousHash = previousHash;
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    // Setter for ID is often omitted for auto-generated fields

    public int getBlockIndex() { return blockIndex; }
    public void setBlockIndex(int blockIndex) { this.blockIndex = blockIndex; }

    public String getHash() { return hash; }
    public void setHash(String hash) { this.hash = hash; }

    public String getPreviousHash() { return previousHash; }
    public void setPreviousHash(String previousHash) { this.previousHash = previousHash; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public int getNonce() { return nonce; }
    public void setNonce(int nonce) { this.nonce = nonce; }

    public List<PaymentTransaction> getTransactions() { return transactions; }
    public void setTransactions(List<PaymentTransaction> transactions) { this.transactions = transactions; }

    // --- Additional Blockchain Method (Crucial for the logic, assuming it was missing) ---
    /**
     * Calculates the hash of the block contents.
     * This method is crucial and likely the source of logic errors if not implemented.
     * Needs a utility class for SHA-256 (not included here).
     */
    @JsonIgnore // Prevent this method from being serialized by Jackson
    public String calculateHash() {
        // Implementation logic for calculating the hash (index, previousHash, timestamp, nonce, transactions root/merkle hash)
        // ... (You must implement the actual SHA-256 logic here)
        return "temp_hash_placeholder";
    }
}