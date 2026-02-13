package com.securepayments.controller;

import com.securepayments.model.Block;
import com.securepayments.model.User;
import com.securepayments.model.PaymentTransaction;
import com.securepayments.service.BlockchainService;
import com.securepayments.service.TransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class TransactionController {

    private final TransactionService transactionService;
    private final BlockchainService blockchainService;

    public TransactionController(TransactionService transactionService, BlockchainService blockchainService) {
        this.transactionService = transactionService;
        this.blockchainService = blockchainService;
    }

    // ====================================================================
    // USER ENDPOINTS
    // ====================================================================

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return transactionService.listUsers();
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return transactionService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/users/{id}/balance")
    public ResponseEntity<BigDecimal> getUserBalance(@PathVariable Long id) {
        return transactionService.findById(id)
                .map(user -> ResponseEntity.ok(user.getBalance()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@RequestBody User user) {
        return transactionService.createUser(
                user.getName(),
                user.getEmail(),
                user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO
        );
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            transactionService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ====================================================================
    // TRANSACTION & BLOCKCHAIN ENDPOINTS
    // ====================================================================

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentTransaction createTransaction(@RequestBody Map<String, Object> transactionRequest) {
        // --- FIX: Implement Transaction Logic ---

        Long senderId = ((Number) transactionRequest.get("senderId")).longValue();
        Long receiverId = ((Number) transactionRequest.get("receiverId")).longValue();
        BigDecimal amount = new BigDecimal(transactionRequest.get("amount").toString());
        BigDecimal networkFee = new BigDecimal(transactionRequest.get("networkFee").toString());

        // This calls the service, which handles the locking and debit.
        return transactionService.createTransaction(senderId, receiverId, amount, networkFee);
    }

    @PostMapping("/mine")
    public ResponseEntity<Block> mine() {
        Block minedBlock = blockchainService.minePendingTransactions();
        if (minedBlock == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(minedBlock);
    }

    @GetMapping("/blockchain")
    public List<Block> getBlockchain() {
        return blockchainService.getChain();
    }

    @GetMapping("/transactions")
    public List<PaymentTransaction> getAllTransactions() {
        return transactionService.getAll();
    }
}