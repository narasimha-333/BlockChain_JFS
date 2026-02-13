package com.securepayments.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.math.BigDecimal;
import java.time.Instant; // NEW: To track transaction creation time

@Entity
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User sender;

    @ManyToOne
    private User receiver;

    // --- ENHANCED FIELDS FOR UI/UX ---

    private BigDecimal amount;
    private String status;

    // NEW: For fee transparency in the UI
    @Column(precision = 19, scale = 8) // Use high precision for crypto fees
    private BigDecimal networkFee;

    // NEW: The unique hash used for "View on Chain" link (Transparency)
    private String transactionHash;

    // NEW: Timestamp for display in transaction history
    private Instant createdAt;

    // ---------------------------------

    @ManyToOne
    @JsonBackReference
    private Block block;

    public PaymentTransaction() {
        this.createdAt = Instant.now(); // Set default creation time
    }

    // UPDATED Constructor to accept networkFee
    public PaymentTransaction(User sender, User receiver, BigDecimal amount, BigDecimal networkFee) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
        this.networkFee = networkFee; // Set the network fee
        this.status = "PENDING";
        this.createdAt = Instant.now(); // Set creation time
    }

    // Getters and setters (Existing)
    public Long getId() { return id; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Block getBlock() { return block; }
    public void setBlock(Block block) { this.block = block; }

    // Getters and setters (NEW)
    public BigDecimal getNetworkFee() { return networkFee; }
    public void setNetworkFee(BigDecimal networkFee) { this.networkFee = networkFee; }

    public String getTransactionHash() { return transactionHash; }
    public void setTransactionHash(String transactionHash) { this.transactionHash = transactionHash; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}