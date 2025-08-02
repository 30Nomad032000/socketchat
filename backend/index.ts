import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Socket.IO server is running!" });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Track users in each room
const roomUsers: Record<string, Set<string>> = {};

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join", (roomId) => {
    // Initialize room if it doesn't exist
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = new Set();
    }

    // Add user to room
    roomUsers[roomId].add(socket.id);
    socket.join(roomId);

    // Send current user list to the new user
    const currentUsers = Array.from(roomUsers[roomId]);
    socket.emit("user-list", currentUsers);

    // Notify other users in the room
    socket.to(roomId).emit("user-joined", socket.id);

    console.log(`User ${socket.id} joined room: ${roomId}`);
    console.log(`Users in room ${roomId}:`, currentUsers);
  });

  // Handle transcribed text messages
  socket.on("transcribed-text", ({ text, userId, username, timestamp }) => {
    console.log(`Message from ${username}: "${text}"`);

    // Broadcast to all users in the same room
    socket.broadcast.emit("transcribed-text", {
      text,
      userId,
      username,
      timestamp,
    });
  });

  // Handle username changes
  socket.on("username-change", ({ userId, username }) => {
    console.log(`Username change: ${userId} is now ${username}`);

    // Broadcast username change to other users
    socket.broadcast.emit("username-change", {
      userId,
      username,
    });
  });

  // Handle cursor movements
  socket.on("cursor-move", ({ x, y, userId, username }) => {
    // Broadcast cursor position to other users
    socket.broadcast.emit("cursor-move", {
      x,
      y,
      userId,
      username,
      timestamp: Date.now(),
    });
  });

  // Handle live typing
  socket.on("live-typing", ({ text, userId, username }) => {
    // Broadcast typing update to other users
    socket.broadcast.emit("live-typing", {
      text,
      userId,
      username,
      timestamp: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    // Remove user from all rooms they were in
    Object.keys(roomUsers).forEach((roomId) => {
      if (roomUsers[roomId].has(socket.id)) {
        roomUsers[roomId].delete(socket.id);

        // Notify remaining users in the room
        io.to(roomId).emit("user-disconnected", socket.id);

        console.log(`User ${socket.id} disconnected from room: ${roomId}`);
        console.log(
          `Remaining users in room ${roomId}:`,
          Array.from(roomUsers[roomId])
        );

        // Clean up empty rooms
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
          console.log(`Room ${roomId} is now empty and has been cleaned up`);
        }
      }
    });

    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`> Server ready at http://localhost:${PORT}`);
  console.log(`> Socket.IO server is running`);
});
