package com.securepayments.service;

import com.securepayments.model.PaymentTransaction;
import com.securepayments.model.User;
import com.securepayments.repository.TransactionRepository;
import com.securepayments.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public TransactionService(TransactionRepository transactionRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    public List<PaymentTransaction> getAll() {
        // FIX: Use the eager fetch method to avoid N+1 queries for user/block details
        return transactionRepository.findAllEagerly();
    }

    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    // =========================================================================
    // CRITICAL FIX: Use PESSIMISTIC LOCK on SENDER and RECEIVER lookup during creation
    // =========================================================================
    @Transactional
    public PaymentTransaction createTransaction(Long senderId, Long receiverId, BigDecimal amount, BigDecimal networkFee) {

        // FIX 1: Fetch SENDER using the concurrency-safe locked method
        User sender = userRepository.findLockedById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        // FIX 2: Fetch RECEIVER using the concurrency-safe locked method
        // Even though we don't change the receiver's balance here, locking prevents
        // mining from starting until we finish the debit.
        User receiver = userRepository.findLockedById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        BigDecimal totalDeduction = amount.add(networkFee);

        // 1. Mandatory Balance Check for Security
        if (sender.getBalance().compareTo(totalDeduction) < 0) {
            throw new IllegalStateException("Insufficient funds. Required: "
                    + totalDeduction + ", Available: " + sender.getBalance());
        }

        // 2. Deduct total amount (principal + fee) from sender's account
        sender.setBalance(sender.getBalance().subtract(totalDeduction));
        userRepository.save(sender);

        // 3. Create the Transaction model
        PaymentTransaction tx = new PaymentTransaction(sender, receiver, amount, networkFee);

        return transactionRepository.save(tx);
    }
    // =========================================================================

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        transactionRepository.deleteBySenderIdOrReceiverId(userId, userId);
        userRepository.delete(user);
    }

    public User createUser(String name, String email, BigDecimal balance) {
        User u = new User(name, email, balance);
        return userRepository.save(u);
    }

    public List<User> listUsers() {
        return userRepository.findAll();
    }
}