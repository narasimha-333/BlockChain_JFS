package com.securepayments.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.securepayments.service.StockService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

    private final StockService stockService;
    private final ObjectMapper objectMapper;

    public StockController(StockService stockService, ObjectMapper objectMapper) {
        this.stockService = stockService;
        this.objectMapper = objectMapper;
    }

    /**
     * Endpoint to fetch the latest price for a given stock symbol.
     * Example: GET /api/stocks/price/AAPL
     */
    @GetMapping("/price/{symbol}")
    public String getStockPrice(@PathVariable String symbol) {
        return stockService.getLatestStockPrice(symbol);
    }

    /**
     * Endpoint to search for stock symbols based on a keyword.
     * Example: GET /api/stocks/search/tesla
     */
    @GetMapping("/search/{keyword}")
    public String searchStocks(@PathVariable String keyword) {
        return stockService.searchStockSymbol(keyword);
    }

    /**
     * Endpoint to fetch historical daily price series for charting.
     * Example: GET /api/stocks/series/GOOGL
     */
    @GetMapping("/series/{symbol}")
    public String getDailyAdjustedSeries(@PathVariable String symbol) {
        return stockService.getDailyAdjustedSeries(symbol);
    }
}