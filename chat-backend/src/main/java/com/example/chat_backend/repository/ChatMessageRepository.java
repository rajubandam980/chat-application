package com.example.chat_backend.repository;

import com.example.chat_backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // All messages between two users, oldest first
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE (m.sender = :a AND m.recipient = :b)
               OR (m.sender = :b AND m.recipient = :a)
            ORDER BY m.sentAt ASC
            """)
    List<ChatMessage> findConversation(@Param("a") String a, @Param("b") String b);
}
