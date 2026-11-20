package com.example.chat_backend.controller;

import com.example.chat_backend.dto.ChatMessageDto;
import com.example.chat_backend.dto.SendMessageRequest;
import com.example.chat_backend.entity.ChatMessage;
import com.example.chat_backend.repository.ChatMessageRepository;
import com.example.chat_backend.repository.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.security.Principal;
import java.time.Instant;

@Controller
public class ChatController {

    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatMessageRepository messages, UserRepository users,
                          SimpMessagingTemplate messagingTemplate) {
        this.messages = messages;
        this.users = users;
        this.messagingTemplate = messagingTemplate;
    }

    // Browser sends to "/app/chat.send"
    @MessageMapping("/chat.send")
    public void send(@Payload SendMessageRequest request, Principal principal) {
        String sender = principal.getName();
        String recipient = request.recipient();
        String content = request.content() == null ? "" : request.content().trim();

        if (recipient == null || content.isEmpty() || content.length() > 2000
                || !users.existsByUsername(recipient)) {
            return; // ignore invalid messages
        }

        ChatMessage saved = messages.save(new ChatMessage(sender, recipient, content, Instant.now()));
        ChatMessageDto dto = ChatMessageDto.from(saved);

        // Deliver to the recipient's private queue, and echo to the sender's other tabs
        messagingTemplate.convertAndSendToUser(recipient, "/queue/messages", dto);
        if (!recipient.equals(sender)) {
            messagingTemplate.convertAndSendToUser(sender, "/queue/messages", dto);
        }
    }
}
