package com.securepayments.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public String home() {
        return """
        ✅ Secure Payments Blockchain App is Running! <br><br>
        Try these API endpoints:<br>
        🔹 <a href='/api/users'>GET /api/users</a><br>
        🔹 <a href='/api/transactions'>GET /api/transactions</a><br>
        🔹 <a href='/api/blockchain'>GET /api/blockchain</a><br>
        """;
    }
}
