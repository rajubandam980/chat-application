package com.example.chat_backend.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "messages", indexes = @Index(columnList = "sender, recipient"))
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String sender;

    @Column(nullable = false, length = 50)
    private String recipient;

    @Column(nullable = false, length = 2000)
    private String content;

    @Column(nullable = false)
    private Instant sentAt;

    private Instant readAt; // null = not read yet

    protected ChatMessage() {} // required by JPA

    public ChatMessage(String sender, String recipient, String content, Instant sentAt) {
        this.sender = sender;
        this.recipient = recipient;
        this.content = content;
        this.sentAt = sentAt;
    }

    public Long getId() { return id; }
    public String getSender() { return sender; }
    public String getRecipient() { return recipient; }
    public String getContent() { return content; }
    public Instant getSentAt() { return sentAt; }
    public Instant getReadAt() { return readAt; }
}