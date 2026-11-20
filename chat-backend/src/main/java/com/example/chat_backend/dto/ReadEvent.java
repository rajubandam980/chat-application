package com.example.chat_backend.dto;

import java.time.Instant;

public record ReadEvent(String reader, Instant readAt) {}