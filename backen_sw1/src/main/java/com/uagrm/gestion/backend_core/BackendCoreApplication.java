package com.uagrm.gestion.backend_core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(excludeName = {
    "org.springframework.ai.autoconfigure.openai.OpenAiAutoConfiguration"
})
public class BackendCoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendCoreApplication.class, args);
    }
}