package com.coffeewithbro.coffee_with_bro.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import com.coffeewithbro.coffee_with_bro.websocket.AslWebSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final AslWebSocketHandler aslWebSocketHandler;

    public WebSocketConfig(AslWebSocketHandler aslWebSocketHandler) {
        this.aslWebSocketHandler = aslWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(aslWebSocketHandler, "/ws/echo")
                .setAllowedOrigins("*");
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        
        container.setMaxTextMessageBufferSize(10 * 1024 * 1024);
        container.setMaxBinaryMessageBufferSize(10 * 1024 * 1024);
        container.setMaxSessionIdleTimeout(600000L); 
        container.setAsyncSendTimeout(10000L);
        return container;
    }
}
