package com.example.chat_backend.service;

import org.springframework.stereotype.Service;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    // username -> ids of that user's open WebSocket sessions (one per tab)
    private final Map<String, Set<String>> sessions = new ConcurrentHashMap<>();

    /** Returns true if the user just came online (their first open tab). */
    public synchronized boolean connect(String username, String sessionId) {
        Set<String> set = sessions.computeIfAbsent(username, k -> new HashSet<>());
        boolean wasOffline = set.isEmpty();
        set.add(sessionId);
        return wasOffline;
    }

    /** Returns true if the user just went offline (their last tab closed). */
    public synchronized boolean disconnect(String username, String sessionId) {
        Set<String> set = sessions.get(username);
        if (set == null || !set.remove(sessionId)) return false; // already handled
        if (set.isEmpty()) {
            sessions.remove(username);
            return true;
        }
        return false;
    }

    public boolean isOnline(String username) {
        return sessions.containsKey(username);
    }
}
