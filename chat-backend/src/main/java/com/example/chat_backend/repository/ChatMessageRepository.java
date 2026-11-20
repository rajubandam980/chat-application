package com.example.chat_backend.repository;

import com.example.chat_backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // All messages between two users, oldest first (chat history)
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE (m.sender = :a AND m.recipient = :b)
               OR (m.sender = :b AND m.recipient = :a)
            ORDER BY m.sentAt ASC
            """)
    List<ChatMessage> findConversation(@Param("a") String a, @Param("b") String b);

    // All my messages (sent or received), newest first (last-message preview)
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.sender = :me OR m.recipient = :me
            ORDER BY m.sentAt DESC
            """)
    List<ChatMessage> findAllForUser(@Param("me") String me);

    // How many unread messages I have from each person: rows of [sender, count]
    @Query("""
            SELECT m.sender, COUNT(m) FROM ChatMessage m
            WHERE m.recipient = :me AND m.readAt IS NULL
            GROUP BY m.sender
            """)
    List<Object[]> countUnreadBySender(@Param("me") String me);

    // Mark everything `sender` sent to `reader` as read; returns how many changed
    @Modifying
    @Transactional
    @Query("""
            UPDATE ChatMessage m SET m.readAt = :now
            WHERE m.sender = :sender AND m.recipient = :reader AND m.readAt IS NULL
            """)
    int markRead(@Param("sender") String sender, @Param("reader") String reader, @Param("now") Instant now);
}