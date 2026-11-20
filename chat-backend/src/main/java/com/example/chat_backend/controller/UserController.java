package com.example.chat_backend.controller;

import com.example.chat_backend.dto.ChatMessageDto;
import com.example.chat_backend.dto.UserDto;
import com.example.chat_backend.entity.ChatMessage;
import com.example.chat_backend.repository.ChatMessageRepository;
import com.example.chat_backend.repository.UserRepository;
import com.example.chat_backend.service.PresenceService;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class UserController {

    private final UserRepository users;
    private final ChatMessageRepository messages;
    private final PresenceService presence;

    public UserController(UserRepository users, ChatMessageRepository messages, PresenceService presence) {
        this.users = users;
        this.messages = messages;
        this.presence = presence;
    }

    @GetMapping("/api/users")
    public List<UserDto> allUsers(Principal principal) {
        String me = principal.getName();

        // The newest message with each person (list is newest first, so keep the first one seen)
        Map<String, ChatMessage> lastByUser = new HashMap<>();
        for (ChatMessage m : messages.findAllForUser(me)) {
            String other = m.getSender().equals(me) ? m.getRecipient() : m.getSender();
            lastByUser.putIfAbsent(other, m);
        }

        return users.findAll(Sort.by("username")).stream()
                .filter(u -> !u.getUsername().equals(me))
                .map(u -> {
                    ChatMessage last = lastByUser.get(u.getUsername());
                    return new UserDto(
                            u.getId(),
                            u.getUsername(),
                            presence.isOnline(u.getUsername()),
                            last == null ? null : ChatMessageDto.from(last));
                })
                .toList();
    }
}