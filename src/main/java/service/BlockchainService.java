package com.securepayments.service;

import com.securepayments.model.Block;
import com.securepayments.model.PaymentTransaction;
import com.securepayments.model.User;
import com.securepayments.repository.BlockRepository;
import com.securepayments.repository.TransactionRepository;
import com.securepayments.repository.UserRepository;
import com.securepayments.util.CryptoUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BlockchainService {

    private final BlockRepository blockRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final int difficulty = 3;

    // FIX: Corrected Constructor
    public BlockchainService(BlockRepository blockRepository,
                             TransactionRepository transactionRepository,
                             UserRepository userRepository) {
        this.blockRepository = blockRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    public List<Block> getChain() {
        return blockRepository.findAllWithTransactions();
    }

    @Transactional
    public Block minePendingTransactions() {
        List<PaymentTransaction> pending = transactionRepository.findByBlockIsNullEagerly();

        if (pending.isEmpty()) {
            return null;
        }

        Block last = blockRepository.findTopByOrderByBlockIndexDesc();
        int nextIndex = (last != null) ? last.getBlockIndex() + 1 : 1;
        String previousHash = (last != null) ? last.getHash() : "0";

        Block block = new Block(nextIndex, previousHash);

        // CRITICAL FIX: Set a temporary, non-null hash value before the first database save
        block.setHash("TEMP_HASH_PLACEHOLDER");

        Block savedBlock = blockRepository.save(block);

        block = savedBlock;

        for (PaymentTransaction tx : pending) {
            tx.setBlock(block);
            tx.setStatus("MINED");
            tx.setTransactionHash(generateTransactionHash(tx));

            User receiver = userRepository.findLockedById(tx.getReceiver().getId())
                    .orElseThrow(() -> new IllegalStateException("Receiver not found during mining!"));
            receiver.setBalance(receiver.getBalance().add(tx.getAmount()));
            userRepository.save(receiver);

            User sender = userRepository.findLockedById(tx.getSender().getId())
                    .orElseThrow(() -> new IllegalStateException("Sender not found during mining!"));
            userRepository.save(sender);
        }

        block.setTransactions(pending);

        // Proof of Work logic
        String prefix = "0".repeat(difficulty);
        int nonce = 0;
        String hash;
        do {
            block.setNonce(nonce++);
            String dataToHash = block.getBlockIndex()
                    + block.getPreviousHash()
                    + block.getTimestamp()
                    + block.getNonce()
                    + block.getTransactions().stream()
                    .map(tx -> tx.getTransactionHash() + ":" + tx.getAmount())
                    .reduce("", String::concat);

            hash = CryptoUtil.applySha256(dataToHash);
        } while (!hash.startsWith(prefix));

        block.setHash(hash);
        blockRepository.save(block); // Final save with correct hash

        transactionRepository.saveAll(pending);

        return block;
    }

    private String generateTransactionHash(PaymentTransaction tx) {
        String data = tx.getSender().getId() + ":" + tx.getReceiver().getId()
                + ":" + tx.getAmount() + ":" + tx.getCreatedAt().toEpochMilli();
        return CryptoUtil.applySha256(data).substring(0, 32);
    }
}