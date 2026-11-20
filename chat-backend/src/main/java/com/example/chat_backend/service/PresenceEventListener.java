package com.example.chat_backend.service;

import com.example.chat_backend.dto.PresenceEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.security.Principal;

@Component
public class PresenceEventListener {

    private final PresenceService presence;
    private final SimpMessagingTemplate messagingTemplate;

    public PresenceEventListener(PresenceService presence, SimpMessagingTemplate messagingTemplate) {
        this.presence = presence;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        Principal user = event.getUser();
        if (user == null) return;
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (presence.connect(user.getName(), sessionId)) {
            messagingTemplate.convertAndSend("/topic/presence", new PresenceEvent(user.getName(), true));
        }
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user == null) return;
        if (presence.disconnect(user.getName(), event.getSessionId())) {
            messagingTemplate.convertAndSend("/topic/presence", new PresenceEvent(user.getName(), false));
        }
    }
}
