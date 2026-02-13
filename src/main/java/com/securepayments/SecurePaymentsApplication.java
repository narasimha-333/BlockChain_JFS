package com.securepayments;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module; // <-- REQUIRED FIX IMPORT
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class SecurePaymentsApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecurePaymentsApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    /**
     * CRITICAL FIX: Registers modules to handle Java 8 types (Instant, Optional)
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // 1. Handles Optional and other JDK 8 types (REQUIRED FIX for 500 Error)
        mapper.registerModule(new Jdk8Module());

        // 2. Handles Instant, LocalDateTime, etc.
        mapper.registerModule(new JavaTimeModule());

        return mapper;
    }
}