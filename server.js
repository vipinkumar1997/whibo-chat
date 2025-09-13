const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Chat state management
class ChatManager {
  constructor() {
    this.waitingUsers = new Set();
    this.activeSessions = new Map();
    this.userSessions = new Map();
    this.bannedWords = new Set(['spam', 'abuse']); // Add more as needed
  }

  addWaitingUser(socketId, userInfo) {
    this.waitingUsers.add(socketId);
    this.userSessions.set(socketId, userInfo);
  }

  removeWaitingUser(socketId) {
    this.waitingUsers.delete(socketId);
  }

  findMatch(socketId) {
    for (let waitingUserId of this.waitingUsers) {
      if (waitingUserId !== socketId) {
        this.waitingUsers.delete(waitingUserId);
        this.waitingUsers.delete(socketId);
        
        const sessionId = uuidv4();
        this.activeSessions.set(sessionId, {
          users: [socketId, waitingUserId],
          createdAt: new Date(),
          messageCount: 0
        });
        
        return { partnerId: waitingUserId, sessionId };
      }
    }
    return null;
  }

  getSession(socketId) {
    for (let [sessionId, session] of this.activeSessions) {
      if (session.users.includes(socketId)) {
        return { sessionId, session };
      }
    }
    return null;
  }

  endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      return session.users;
    }
    return [];
  }

  cleanupUser(socketId) {
    this.removeWaitingUser(socketId);
    this.userSessions.delete(socketId);
    
    const sessionData = this.getSession(socketId);
    if (sessionData) {
      const { sessionId } = sessionData;
      this.endSession(sessionId);
    }
  }

  filterMessage(message) {
    let filtered = message;
    for (let word of this.bannedWords) {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
    return filtered;
  }

  incrementMessageCount(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.messageCount++;
    }
  }
}

const chatManager = new ChatManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Generate anonymous user info
  const anonymousNames = ['Stranger', 'Anonymous', 'Unknown', 'Visitor', 'Guest'];
  const randomName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
  
  const userInfo = {
    id: socket.id,
    name: `${randomName}_${Math.floor(Math.random() * 1000)}`,
    joinedAt: new Date()
  };

  socket.emit('user-info', userInfo);

  // Handle finding a chat partner
  socket.on('find-partner', () => {
    chatManager.addWaitingUser(socket.id, userInfo);
    
    const match = chatManager.findMatch(socket.id);
    if (match) {
      const { partnerId, sessionId } = match;
      
      // Notify both users they are connected
      socket.emit('partner-found', { sessionId, partnerId });
      socket.to(partnerId).emit('partner-found', { sessionId, partnerId: socket.id });
      
      // Join both users to a room
      socket.join(sessionId);
      io.sockets.sockets.get(partnerId)?.join(sessionId);
      
      console.log(`Match found: ${socket.id} <-> ${partnerId} in session ${sessionId}`);
    } else {
      socket.emit('waiting-for-partner');
    }
  });

  // Handle sending messages
  socket.on('send-message', (data) => {
    const { message, sessionId } = data;
    
    // Validate message
    if (!message || message.trim().length === 0 || message.length > 500) {
      socket.emit('error', { message: 'Invalid message' });
      return;
    }

    const sessionData = chatManager.getSession(socket.id);
    if (!sessionData || sessionData.sessionId !== sessionId) {
      socket.emit('error', { message: 'Invalid session' });
      return;
    }

    // Filter message content
    const filteredMessage = chatManager.filterMessage(message.trim());
    
    // Increment message count
    chatManager.incrementMessageCount(sessionId);
    
    const messageData = {
      message: filteredMessage,
      timestamp: new Date().toISOString(),
      senderId: socket.id
    };

    // Send to all users in the session
    io.to(sessionId).emit('receive-message', messageData);
    
    console.log(`Message in session ${sessionId}: ${filteredMessage}`);
  });

  // Handle ending chat
  socket.on('end-chat', () => {
    const sessionData = chatManager.getSession(socket.id);
    if (sessionData) {
      const { sessionId } = sessionData;
      const users = chatManager.endSession(sessionId);
      
      // Notify all users in the session
      io.to(sessionId).emit('chat-ended');
      
      // Remove users from the room
      users.forEach(userId => {
        const userSocket = io.sockets.sockets.get(userId);
        if (userSocket) {
          userSocket.leave(sessionId);
        }
      });
      
      console.log(`Chat ended in session ${sessionId}`);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { sessionId, isTyping } = data;
    const sessionData = chatManager.getSession(socket.id);
    
    if (sessionData && sessionData.sessionId === sessionId) {
      socket.to(sessionId).emit('partner-typing', { isTyping, userId: socket.id });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const sessionData = chatManager.getSession(socket.id);
    if (sessionData) {
      const { sessionId } = sessionData;
      socket.to(sessionId).emit('partner-disconnected');
      chatManager.endSession(sessionId);
    }
    
    chatManager.cleanupUser(socket.id);
  });
});

// API Routes
app.get('/api/stats', (req, res) => {
  res.json({
    activeUsers: io.sockets.sockets.size,
    waitingUsers: chatManager.waitingUsers.size,
    activeSessions: chatManager.activeSessions.size
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 WhibO Chat Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to start chatting`);
  console.log(`🌟 WhibO - Connect. Chat. Discover.`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, chatManager };
