package com.securepayments.controller;

import com.securepayments.service.AIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AIController {

    private final AIService aiService;

    public AIController(AIService aiService) {
        this.aiService = aiService;
    }

    /**
     * POST /api/analyze-transaction
     * Takes transaction details and returns a JSON risk analysis using the Gemini API.
     */
    @PostMapping("/analyze-transaction")
    public ResponseEntity<String> analyzeTransaction(@RequestBody Map<String, Object> transactionRequest) {

        // 1. Parse Input from the frontend request body
        // Number is used to safely handle JSON parsing of integers/doubles.
        Long senderId = ((Number) transactionRequest.get("senderId")).longValue();
        Long receiverId = ((Number) transactionRequest.get("receiverId")).longValue();

        BigDecimal amount = new BigDecimal(transactionRequest.get("amount").toString());
        BigDecimal networkFee = new BigDecimal(transactionRequest.get("networkFee").toString());

        // 2. Call the AI Service for analysis
        String analysisJson = aiService.analyzeTransaction(senderId, receiverId, amount, networkFee);

        // 3. Return the raw JSON string received from the AI service
        return ResponseEntity.ok(analysisJson);
    }
}