const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const path = require('path');

// SSL Certificate
const options = {
    key: fs.readFileSync('/etc/apache2/ssl/jocarsa.key'),
    cert: fs.readFileSync('/etc/apache2/ssl/jocarsa_combined.cer')
};

const app = express();
const server = https.createServer(options, app);
const io = new Server(server);

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO logic
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // When user joins room, store username + roomId
    socket.on('join-room', (data) => {
        const { roomId, username } = data;
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
            userId: socket.id,
            username: socket.username
        });
    });

    // WebRTC signaling
    socket.on('signal', (data) => {
        // data: { to, signal: { sdp OR candidate } }
        io.to(data.to).emit('signal', { 
            from: socket.id, 
            signal: data.signal 
        });
    });

    // Chat messages
    socket.on('chat-message', (messageText) => {
        io.to(socket.roomId).emit('chat-message', {
            userId: socket.id,
            username: socket.username,
            text: messageText
        });
    });

    // Disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (socket.roomId) {
            io.to(socket.roomId).emit('user-disconnected', socket.id);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🔒 Secure server running on https://localhost:${PORT}`);
});

