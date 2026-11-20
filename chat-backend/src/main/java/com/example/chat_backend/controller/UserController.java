package com.example.chat_backend.controller;

import com.example.chat_backend.dto.UserDto;
import com.example.chat_backend.repository.UserRepository;
import com.example.chat_backend.service.PresenceService;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.List;

@RestController
public class UserController {

    private final UserRepository users;
    private final PresenceService presence;

    public UserController(UserRepository users, PresenceService presence) {
        this.users = users;
        this.presence = presence;
    }

    @GetMapping("/api/users")
    public List<UserDto> allUsers(Principal principal) {
        return users.findAll(Sort.by("username")).stream()
                .filter(u -> !u.getUsername().equals(principal.getName()))
                .map(u -> new UserDto(u.getId(), u.getUsername(), presence.isOnline(u.getUsername())))
                .toList();
    }
}