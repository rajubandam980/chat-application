package com.example.chat_backend.controller;

import com.example.chat_backend.dto.UserDto;
import com.example.chat_backend.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.List;

@RestController
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/api/users")
    public List<UserDto> allUsers(Principal principal) {
        return users.findAll(Sort.by("username")).stream()
                .filter(u -> !u.getUsername().equals(principal.getName()))
                .map(u -> new UserDto(u.getId(), u.getUsername()))
                .toList();
    }
}
