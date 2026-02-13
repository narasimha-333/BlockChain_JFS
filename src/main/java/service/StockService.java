package com.securepayments.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;

@Service
public class StockService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Configuration values read from application.properties
    @Value("${stock.api.base-url}")
    private String stockApiBaseUrl;

    @Value("${stock.api.key}")
    private String stockApiKey;

    // --- In-Memory Caching ---
    private final Map<String, StockDataCache> stockCache = new ConcurrentHashMap<>();

    // Cache expiry time (3600 seconds = 1 hour).
    private static final long CACHE_EXPIRY_SECONDS = 3600;

    public StockService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Fetches the latest price for a stock symbol, utilizing a 1-hour cache.
     * @param symbol The stock ticker (e.g., "AAPL").
     * @return The latest stock price as a String, or "N/A" on failure/if API key is missing.
     */
    public String getLatestStockPrice(String symbol) {
        // Use the injected key directly
        if (stockApiKey == null || stockApiKey.isEmpty() || stockApiKey.contains("YOUR_STOCK_API_KEY")) {
            return "N/A (API Key missing)";
        }

        // 1. Check Cache
        StockDataCache cachedData = stockCache.get(symbol);
        Instant now = Instant.now();

        if (cachedData != null &&
                cachedData.timestamp.plusSeconds(CACHE_EXPIRY_SECONDS).isAfter(now)) {

            System.out.println("Returning cached price for " + symbol);
            return cachedData.price;
        }

        // 2. Fetch from External API
        try {
            // Alpha Vantage GLOBAL_QUOTE function call
            String url = String.format("%sfunction=GLOBAL_QUOTE&symbol=%s&apikey=%s",
                    stockApiBaseUrl, symbol, stockApiKey);

            String apiResponse = restTemplate.getForObject(url, String.class);

            // 3. Parse Price from JSON response
            JsonNode root = objectMapper.readTree(apiResponse);

            // CORRECT JSON PATH for Alpha Vantage's GLOBAL_QUOTE price field
            String price = root.at("/Global Quote/05. price").asText();

            if (price != null && !price.isEmpty() && !price.equals("null")) {
                // 4. Update Cache
                stockCache.put(symbol, new StockDataCache(price, now));
                return price;
            } else if (apiResponse.contains("Error Message")) {
                // Check for API-specific error message (e.g., invalid ticker, rate limit)
                return "API Error: Check rate limit or symbol.";
            }

        } catch (Exception e) {
            System.err.println("Error fetching stock price for " + symbol + ": " + e.getMessage());
            // Fallback: return the stale cached price if available, or N/A
            if (cachedData != null) {
                return cachedData.price + " (STALE)";
            }
            return "N/A (Connection Error)";
        }

        return "N/A (Unknown Data)";
    }

    /**
     * Searches for stock symbols and company names based on a keyword.
     * Uses the Alpha Vantage SYMBOL_SEARCH API function.
     * @param keyword The search term (e.g., "tesla" or "TSL").
     * @return The raw JSON response from the search API.
     */
    public String searchStockSymbol(String keyword) {
        if (stockApiKey == null || stockApiKey.isEmpty() || stockApiKey.contains("YOUR_STOCK_API_KEY")) {
            return "{\"error\":\"API Key not configured.\"}";
        }

        try {
            // URL for Alpha Vantage SYMBOL_SEARCH function
            String url = String.format("%sfunction=SYMBOL_SEARCH&keywords=%s&apikey=%s",
                    stockApiBaseUrl, keyword, stockApiKey);

            // Use RestTemplate to get the raw JSON response
            String apiResponse = restTemplate.getForObject(url, String.class);

            return apiResponse;

        } catch (Exception e) {
            System.err.println("Error searching stock symbol for " + keyword + ": " + e.getMessage());
            return "{\"error\":\"Connection Error or Invalid Request.\"}";
        }
    }

    /**
     * Fetches the historical daily adjusted time series data for a stock.
     * This data is used to render the price chart.
     * @param symbol The stock ticker (e.g., "AAPL").
     * @return The raw JSON response containing the time series data.
     */
    public String getDailyAdjustedSeries(String symbol) {
        if (stockApiKey == null || stockApiKey.isEmpty() || stockApiKey.contains("YOUR_STOCK_API_KEY")) {
            return "{\"Error Message\":\"API Key not configured.\"}";
        }

        try {
            // Alpha Vantage TIME_SERIES_DAILY_ADJUSTED function call
            String url = String.format("%sfunction=TIME_SERIES_DAILY_ADJUSTED&symbol=%s&outputsize=compact&apikey=%s",
                    stockApiBaseUrl, symbol, stockApiKey);

            String apiResponse = restTemplate.getForObject(url, String.class);

            return apiResponse;

        } catch (Exception e) {
            System.err.println("Error fetching historical stock series for " + symbol + ": " + e.getMessage());
            return "{\"Error Message\":\"Connection Error fetching historical data.\"}";
        }
    }

    // Simple private class to hold cached data
    private static class StockDataCache {
        final String price;
        final Instant timestamp;

        StockDataCache(String price, Instant timestamp) {
            this.price = price;
            this.timestamp = timestamp;
        }
    }
}