package com.securepayments.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value; // NEW IMPORT
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

@Service
public class AIService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // 1. INJECT KEY: Reads the value from application.properties
    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final String GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";

    public AIService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public String analyzeTransaction(Long senderId, Long receiverId, BigDecimal amount, BigDecimal networkFee) {
        // 2. CHECK KEY: Use the injected key for runtime check
        if (this.geminiApiKey == null || this.geminiApiKey.isEmpty() || this.geminiApiKey.contains("YOUR_GEMINI_API_KEY")) {
            System.err.println("AI Service Bypassed: Gemini API key is not configured or is a placeholder.");
            return "{\"summary\":\"AI analysis bypassed. API key not set.\", \"risk\":\"LOW\"}";
        }

        String apiUrlWithKey = GEMINI_API_BASE_URL + this.geminiApiKey; // 3. Use the injected key in the URL

        // 1. Construct the System Instruction and User Query
        String systemPrompt = "You are a specialized financial risk analyst for a secure payment platform. Your task is to provide a concise, single-paragraph risk analysis and a classification score (LOW, MEDIUM, or HIGH) based on the transaction details. Be highly security-focused and use professional but simple language.";

        String userQuery = String.format(
                "Analyze the following transaction request and provide a summary and risk score in JSON format. Amount: %s, Network Fee: %s, Sender ID: %d, Receiver ID: %d.",
                amount.toPlainString(), networkFee.toPlainString(), senderId, receiverId
        );

        // 2. Build the JSON Payload (using text blocks for clean code)
        String jsonPayload = String.format("""
            {
                "contents": [ { "parts": [ { "text": "%s" } ] } ],
                "systemInstruction": { "parts": [ { "text": "%s" } ] },
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "summary": { "type": "STRING", "description": "A single sentence risk summary." },
                            "risk": { "type": "STRING", "description": "Risk score: LOW, MEDIUM, or HIGH." }
                        }
                    }
                }
            }
            """, userQuery, systemPrompt);


        try {
            // 3. Send the request to the Gemini API
            String apiResponse = restTemplate.postForObject(apiUrlWithKey, jsonPayload, String.class);

            // 4. Parse the JSON response to extract the structured text part
            JsonNode root = objectMapper.readTree(apiResponse);
            String aiResultText = root.at("/candidates/0/content/parts/0/text").asText();

            // The AI result is already a JSON string containing {summary, risk}
            return aiResultText;

        } catch (Exception e) {
            System.err.println("AI Service Communication Error: " + e.getMessage());
            // Fail safe: return a MEDIUM risk error message if the API call fails
            return "{\"summary\":\"AI communication failed. Check API key status or network connection.\", \"risk\":\"MEDIUM\"}";
        }
    }
}
