import "dotenv/config"
import { WebSocket, WebSocketServer } from 'ws';
import { prismaClient } from "@repo/db/client";
import { authenticateWebSocket } from "./middleware"

interface User {
    ws: WebSocket,
    userId: string,
    userName: string,
    rooms: string[]
}

const users: User[] = [];

const PORT = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

// ── Helper: broadcast to all users in a room (optionally excluding one) ──
function broadcastToRoom(roomId: string, data: object, excludeUserId?: string) {
    const message = JSON.stringify(data);
    users.forEach(u => {
        if (u.rooms.includes(roomId) && u.userId !== excludeUserId && u.ws.readyState === WebSocket.OPEN) {
            u.ws.send(message);
        }
    });
}

// ── Helper: get the list of user names in a room ──
function getUsersInRoom(roomId: string): { name: string }[] {
    return users
        .filter(u => u.rooms.includes(roomId))
        .map(u => ({ name: u.userName }));
}

wss.on("connection", (ws, request) => {
    const url = request.url;
    if (!url) {
        ws.close(1008, "Missing token");
        return;
    }

    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token');
    const decodedUser = authenticateWebSocket(token || "");
    if (!decodedUser) {
        ws.close(1008, "Invalid or expired token");
        return;
    }
    
    if (typeof decodedUser === "object" && "userId" in decodedUser) {
        console.log(`User ${decodedUser.userId} connected`);
        users.push({
            ws,
            userId: decodedUser.userId,
            userName: "", // Will be set when they join a room
            rooms: []
        });

        // Send userId back so the client can filter self-messages
        ws.send(JSON.stringify({ type: "connected", userId: decodedUser.userId }));

        ws.on("message", async (message) => {
            const parsedData = JSON.parse(message.toString());

            if (parsedData.type === "join_room") {
                const user = users.find(u => u.ws === ws);
                if (user) {
                    const roomId = String(parsedData.roomId);
                    user.rooms.push(roomId);

                    // Store the user's display name (sent from the client)
                    if (parsedData.userName) {
                        user.userName = parsedData.userName;
                    }

                    console.log(`User ${user.userName || user.userId} joined room ${roomId}`);

                    // 1. Notify everyone else in the room that this user joined
                    broadcastToRoom(roomId, {
                        type: "user_joined",
                        userName: user.userName,
                        userId: user.userId,
                    }, user.userId);

                    // 2. Send the current user list to the newly joined user
                    ws.send(JSON.stringify({
                        type: "room_users",
                        roomId,
                        users: getUsersInRoom(roomId),
                    }));
                }

            } else if (parsedData.type === "leave_room") {
                const user = users.find(u => u.ws === ws);
                if (user) {
                    const roomId = String(parsedData.roomId);
                    user.rooms = user.rooms.filter(r => r !== roomId);

                    console.log(`User ${user.userName || user.userId} left room ${roomId}`);

                    // Notify everyone else in the room
                    broadcastToRoom(roomId, {
                        type: "user_left",
                        userName: user.userName,
                        userId: user.userId,
                    });
                }

            } else if (parsedData.type === "chat") {
                await prismaClient.chat.create({
                    data: {
                        roomId: parsedData.roomId,
                        message: parsedData.message,
                        userId: decodedUser.userId
                    }
                });
                const user = users.find(u => u.ws === ws);
                if (user && parsedData.roomId) {
                    users.forEach(u => {
                        if (u.rooms.includes(String(parsedData.roomId))) {
                            u.ws.send(JSON.stringify({
                                type: "chat",
                                roomId: parsedData.roomId,
                                message: parsedData.message,
                                sender: decodedUser.userId
                            }));
                        }
                    });
                }
            }
        });

        ws.on("close", () => {
            const user = users.find(u => u.ws === ws);
            if (user) {
                // Broadcast user_left to every room the user was in
                user.rooms.forEach(roomId => {
                    broadcastToRoom(roomId, {
                        type: "user_left",
                        userName: user.userName,
                        userId: user.userId,
                    });
                });
                console.log(`User ${user.userName || user.userId} disconnected`);
            }
            // Remove the user from the list
            const index = users.findIndex(u => u.ws === ws);
            if (index !== -1) users.splice(index, 1);
        });
    } else {
        ws.close(1008, "Invalid user");
    }
})