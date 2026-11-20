package com.example.chat_backend.repository;

import com.example.chat_backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // All messages between two users, oldest first (used for chat history)
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE (m.sender = :a AND m.recipient = :b)
               OR (m.sender = :b AND m.recipient = :a)
            ORDER BY m.sentAt ASC
            """)
    List<ChatMessage> findConversation(@Param("a") String a, @Param("b") String b);

    // All my messages (sent or received), newest first (used for the last-message preview)
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.sender = :me OR m.recipient = :me
            ORDER BY m.sentAt DESC
            """)
    List<ChatMessage> findAllForUser(@Param("me") String me);
}