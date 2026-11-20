package com.example.chat_backend.config;

import com.example.chat_backend.repository.UserRepository;
import com.example.chat_backend.security.JwtService;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final UserRepository users;
    private final String allowedOrigin;

    public WebSocketConfig(JwtService jwtService, UserRepository users,
                           @Value("${app.cors.allowed-origin}") String allowedOrigin) {
        this.jwtService = jwtService;
        this.users = users;
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigin);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue", "/topic");   // was: enableSimpleBroker("/queue")            // server -> client
        registry.setApplicationDestinationPrefixes("/app"); // client -> server
        registry.setUserDestinationPrefix("/user");         // private per-user queues
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String header = accessor.getFirstNativeHeader("Authorization");
                    if (header == null || !header.startsWith("Bearer ")) {
                        throw new IllegalArgumentException("Missing token");
                    }
                    String username;
                    try {
                        username = jwtService.extractUsername(header.substring(7));
                    } catch (JwtException e) {
                        throw new IllegalArgumentException("Invalid token");
                    }
                    if (!users.existsByUsername(username)) {
                        throw new IllegalArgumentException("Unknown user");
                    }
                    accessor.setUser(new UsernamePasswordAuthenticationToken(username, null, List.of()));
                }
                return message;
            }
        });
    }
}
