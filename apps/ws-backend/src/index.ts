import "dotenv/config"
import { WebSocket, WebSocketServer } from 'ws';
import { authenticateWebSocket } from "./middleware"

interface User {
    ws: WebSocket,
    userId: string,
    room: string[]
}

const users: User[] =[];

const PORT = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

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
            room: []
        });
        ws.on("message", (message) => {
            const parsedData = JSON.parse(message.toString());
            if (parsedData.type === "join_room") {
                const user = users.find(u => u.userId === decodedUser.userId);
                if (user) {
                    user.room.push(parsedData.roomId);
                    console.log(`User ${decodedUser.userId} joined room ${parsedData.roomId}`);
                }
            } else if (parsedData.type === "leave_room") {
                const user = users.find(u => u.userId === decodedUser.userId);
                if (user) {
                    user.room = user.room.filter(r => r !== parsedData.roomId);
                }
                console.log(`User ${decodedUser.userId} left the room ${parsedData.roomId}`);
            } else if (parsedData.type === "chat") {
                const user = users.find(u => u.userId === decodedUser.userId);
                if (user && parsedData.roomId) {
                    users.forEach(u => {
                        if (u.room.includes(parsedData.roomId) && u.userId !== parsedData.userId) {
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
            console.log(`User ${decodedUser.userId} disconnected`);
        });
    } else {
        ws.close(1008, "Invalid user");
    }
})