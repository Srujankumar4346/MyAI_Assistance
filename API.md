# NOVA_X API Documentation

The NOVA_X API provides RESTful endpoints and real-time WebSocket streams for controlling the Browser, Desktop, Memory, and Voice engines.

## Authentication
All endpoints require a JSON Web Token (JWT).
Include it in your HTTP Headers:
`Authorization: Bearer <token>`

For WebSockets, pass it as a query parameter:
`ws://localhost:8000/api/browser/ws?token=<token>&workspace_id=<id>`

---

## 1. REST Endpoints

### Browser Engine
`GET /api/browser/status`
Returns the current health and driver status of the BrowserSessionManager.

**Response (200 OK):**
```json
{
  "active_sessions": 2,
  "state": "READY",
  "memory_usage_mb": 140,
  "health_score": 98
}
```

`POST /api/browser/sessions`
Instantiates a new Playwright context.

**Request:**
```json
{
  "headless": true,
  "proxy": null
}
```

### Desktop Engine
`POST /api/desktop/execute`
Runs an OS-level command validated by the SafetyValidator.

---

## 2. WebSocket Endpoints

NOVA_X utilizes WebSockets for event-driven telemetry and low-latency interaction.

`WS /api/browser/ws`
Streams live `EventBus` payloads directly from the BrowserEngine to the client.

**Example Payload (Received):**
```json
{
  "event_type": "TAB_OPENED",
  "payload": {
    "url": "https://github.com",
    "timestamp": "2026-07-24T12:00:00Z"
  }
}
```

## Error Codes
- `400 Bad Request`: Invalid parameters or missing payload elements.
- `401 Unauthorized`: Missing or invalid JWT.
- `403 Forbidden`: Authenticated, but lacking permissions (handled by `SafetyValidator`).
- `500 Internal Server Error`: Unexpected engine crashes (e.g. Playwright disconnects).
