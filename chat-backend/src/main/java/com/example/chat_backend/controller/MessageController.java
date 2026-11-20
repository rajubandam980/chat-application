package com.example.chat_backend.controller;

import com.example.chat_backend.dto.ChatMessageDto;
import com.example.chat_backend.repository.ChatMessageRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.List;

@RestController
public class MessageController {

    private final ChatMessageRepository messages;

    public MessageController(ChatMessageRepository messages) {
        this.messages = messages;
    }

    @GetMapping("/api/messages/{otherUser}")
    public List<ChatMessageDto> history(@PathVariable String otherUser, Principal principal) {
        return messages.findConversation(principal.getName(), otherUser).stream()
                .map(ChatMessageDto::from)
                .toList();
    }
}
