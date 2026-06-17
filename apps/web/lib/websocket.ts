const WS_URL = "ws://localhost:8080";

let ws: WebSocket | null = null;
let currentRoomId: number | null = null;

type MessageHandler = (data: any) => void;
let onMessageHandler: MessageHandler | null = null;

/**
 * Connect to the WebSocket server.
 * Auth is done via the JWT token passed as a query param.
 * Returns a promise that resolves when the connection is open.
 */
export function connectToWebSocket(roomId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Don't open duplicate connections
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Already connected — just join the new room
      joinRoom(roomId);
      resolve();
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      reject(new Error("No auth token found"));
      return;
    }

    ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      console.log("[WS] Connected to server");
      joinRoom(roomId);
      resolve();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessageHandler) {
          onMessageHandler(data);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
      reject(err);
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      ws = null;
      currentRoomId = null;
    };
  });
}

/**
 * Send a join_room message to the WS server (includes userName for presence).
 */
function joinRoom(roomId: number) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  currentRoomId = roomId;
  const userName = localStorage.getItem("userName") || "Anonymous";
  ws.send(JSON.stringify({ type: "join_room", roomId, userName }));
  console.log("[WS] Joined room:", roomId, "as", userName);
}

/**
 * Send a leave_room message and close the connection.
 */
export function disconnectFromWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN && currentRoomId !== null) {
    ws.send(JSON.stringify({ type: "leave_room", roomId: currentRoomId }));
    console.log("[WS] Left room:", currentRoomId);
  }
  ws?.close();
  ws = null;
  currentRoomId = null;
  onMessageHandler = null;
}

/**
 * Register a callback for incoming WS messages.
 * Call this after connecting to handle chat/draw events.
 */
export function onWebSocketMessage(handler: MessageHandler) {
  onMessageHandler = handler;
}

/**
 * Send a message to the current room.
 */
export function sendToRoom(message: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN || currentRoomId === null) {
    console.warn("[WS] Not connected to any room");
    return;
  }
  ws.send(
    JSON.stringify({
      type: "chat",
      roomId: currentRoomId,
      message,
    })
  );
}

/**
 * Check if currently connected.
 */
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
