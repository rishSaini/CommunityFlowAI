"""WebSocket connection manager for real-time dashboard updates.

Source of truth: core.md §3
"""

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts messages to all."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept an incoming WebSocket and register it."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from the active pool."""
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        """Send a JSON message to every connected client.

        Silently drops connections that have already closed.
        """
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:  # noqa: BLE001 — closed / broken sockets
                self.active_connections.remove(connection)


# Module-level singleton used across the application.
manager = ConnectionManager()
