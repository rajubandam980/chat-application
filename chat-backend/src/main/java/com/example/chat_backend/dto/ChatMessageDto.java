package com.example.chat_backend.dto;

// ChatMessageDto.java

import com.example.chat_backend.entity.ChatMessage;

import java.time.Instant;

public record ChatMessageDto(Long id, String sender, String recipient, String content, Instant sentAt) {

    public static ChatMessageDto from(ChatMessage m) {
        return new ChatMessageDto(m.getId(), m.getSender(), m.getRecipient(), m.getContent(), m.getSentAt());
    }
}
