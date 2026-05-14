const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── CONNECT DATABASE ───────────────────────────────────
connectDB();

// ── SOCKET.IO SETUP ────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // User joins their personal room
    socket.on('join', (userId, role) => {
        const room = `${role}_${userId}`;
        socket.join(room);
        console.log(`✅ ${role} [${userId}] joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// ── MIDDLEWARE ─────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API ROUTES ─────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/admin', require('./routes/admin'));

// ── HEALTH CHECK ───────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Server is running!',
        database: 'MongoDB Connected',
        timestamp: new Date().toISOString(),
    });
});

// ── SERVE FRONTEND ─────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── START SERVER ───────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📦 Database: MongoDB`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('================================');
});