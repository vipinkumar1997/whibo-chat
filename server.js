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
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "https:"],
      manifestSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Serve static files
app.use(express.static('public'));

// Admin authentication
let adminCredentials = {
  username: 'admin',
  password: 'admin123',
  token: 'admin123'
};

const adminAuth = (req, res, next) => {
  const { authorization } = req.headers;
  if (authorization === `Bearer ${adminCredentials.token}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Admin Routes
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === adminCredentials.username && password === adminCredentials.password) {
    res.json({ 
      success: true, 
      token: adminCredentials.token,
      message: 'Login successful' 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

app.post('/api/admin/change-password', adminAuth, (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body;
  
  if (currentPassword !== adminCredentials.password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Current password is incorrect' 
    });
  }
  
  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must be at least 6 characters long' 
    });
  }
  
  // Update credentials
  if (newUsername) {
    adminCredentials.username = newUsername;
  }
  
  if (newPassword) {
    adminCredentials.password = newPassword;
    // Generate new token
    adminCredentials.token = 'admin_' + Math.random().toString(36).substr(2, 15);
  }
  
  chatManager.logActivity(`Admin credentials updated`, 'admin');
  
  res.json({ 
    success: true, 
    message: 'Credentials updated successfully',
    newToken: adminCredentials.token
  });
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  res.json(chatManager.getStats());
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  res.json(chatManager.getUsers());
});

app.get('/api/admin/chats', adminAuth, (req, res) => {
  res.json(chatManager.getActiveChats());
});

app.get('/api/admin/activity', adminAuth, (req, res) => {
  res.json(chatManager.activityLog);
});

app.post('/api/admin/settings', adminAuth, (req, res) => {
  const { bannedWords, rateLimit, maintenanceMode } = req.body;
  
  if (bannedWords) {
    chatManager.updateBannedWords(bannedWords);
  }
  
  if (rateLimit) {
    chatManager.updateRateLimit(rateLimit);
  }
  
  if (typeof maintenanceMode === 'boolean') {
    chatManager.setMaintenanceMode(maintenanceMode);
  }
  
  res.json({ success: true, message: 'Settings updated' });
});

app.post('/api/admin/disconnect/:userId', adminAuth, (req, res) => {
  const { userId } = req.params;
  chatManager.disconnectUser(userId);
  res.json({ success: true, message: 'User disconnected' });
});

app.post('/api/admin/end-chat/:sessionId', adminAuth, (req, res) => {
  const { sessionId } = req.params;
  chatManager.endChatSession(sessionId);
  res.json({ success: true, message: 'Chat session ended' });
});

app.post('/api/admin/end-all-chats', adminAuth, (req, res) => {
  chatManager.endAllChats();
  res.json({ success: true, message: 'All chats ended' });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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
    this.rateLimit = 100; // messages per 15 minutes
    this.maintenanceMode = false;
    this.adminSockets = new Set();
    this.activityLog = [];
    this.publicChatUsers = new Set();
    this.publicChatMessages = [];
    this.stats = {
      totalMessages: 0,
      sessionsCreated: 0,
      usersConnected: 0,
      publicChatMessages: 0
    };
  }

  addAdmin(socketId) {
    this.adminSockets.add(socketId);
  }

  removeAdmin(socketId) {
    this.adminSockets.delete(socketId);
  }

  logActivity(message, type = 'info') {
    const activity = {
      timestamp: new Date(),
      message,
      type
    };
    this.activityLog.unshift(activity);
    
    // Keep only last 100 activities
    if (this.activityLog.length > 100) {
      this.activityLog.pop();
    }

    // Broadcast to admin clients
    this.broadcastToAdmins('admin-activity', activity);
  }

  broadcastToAdmins(event, data) {
    this.adminSockets.forEach(adminId => {
      const adminSocket = io.sockets.sockets.get(adminId);
      if (adminSocket) {
        adminSocket.emit(event, data);
      }
    });
  }

  getStats() {
    return {
      activeUsers: io.sockets.sockets.size,
      waitingUsers: this.waitingUsers.size,
      activeSessions: this.activeSessions.size,
      publicChatUsers: this.publicChatUsers.size,
      totalMessages: this.stats.totalMessages,
      publicChatMessages: this.stats.publicChatMessages,
      sessionsCreated: this.stats.sessionsCreated,
      usersConnected: this.stats.usersConnected,
      uptime: process.uptime(),
      memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
      cpuUsage: Math.round(Math.random() * 50) // Placeholder - use actual CPU monitoring in production
    };
  }

  getUsers() {
    const users = [];
    io.sockets.sockets.forEach((socket, id) => {
      const userInfo = this.userSessions.get(id);
      if (userInfo && !this.adminSockets.has(id)) {
        users.push({
          id,
          name: userInfo.name,
          status: 'connected',
          connectedAt: userInfo.joinedAt,
          isInChat: this.getSession(id) !== null
        });
      }
    });
    return users;
  }

  getActiveChats() {
    const chats = [];
    this.activeSessions.forEach((session, sessionId) => {
      chats.push({
        id: sessionId,
        user1: session.users[0],
        user2: session.users[1],
        createdAt: session.createdAt,
        messageCount: session.messageCount,
        duration: Date.now() - session.createdAt.getTime()
      });
    });
    return chats;
  }

  updateBannedWords(words) {
    this.bannedWords = new Set(words);
    this.logActivity(`Banned words updated: ${words.length} words`);
  }

  updateRateLimit(limit) {
    this.rateLimit = limit;
    this.logActivity(`Rate limit updated to ${limit} requests per 15 minutes`);
  }

  setMaintenanceMode(enabled) {
    this.maintenanceMode = enabled;
    this.logActivity(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  disconnectUser(userId) {
    const socket = io.sockets.sockets.get(userId);
    if (socket) {
      socket.disconnect();
      this.logActivity(`User ${userId.substring(0, 8)} disconnected by admin`);
    }
  }

  endChatSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.users.forEach(userId => {
        const socket = io.sockets.sockets.get(userId);
        if (socket) {
          socket.emit('chat-ended');
          socket.leave(sessionId);
        }
      });
      this.activeSessions.delete(sessionId);
      this.logActivity(`Chat session ${sessionId.substring(0, 8)} ended by admin`);
    }
  }

  endAllChats() {
    const sessionCount = this.activeSessions.size;
    this.activeSessions.forEach((session, sessionId) => {
      this.endChatSession(sessionId);
    });
    this.logActivity(`All ${sessionCount} chat sessions ended by admin`);
  }

  containsBannedContent(message) {
    const lowerMessage = message.toLowerCase();
    for (const word of this.bannedWords) {
      if (lowerMessage.includes(word.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  filterMessage(message) {
    let filtered = message;
    this.bannedWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
  }

  // Public chat room methods
  joinPublicChat(userId, userInfo) {
    this.publicChatUsers.add(userId);
    this.userSessions.set(userId, userInfo);
    this.logActivity(`User ${userInfo.name} joined public chat`, 'public-chat');
    
    // Send recent messages to new user
    const recentMessages = this.publicChatMessages.slice(-50); // Last 50 messages
    return recentMessages;
  }

  leavePublicChat(userId) {
    this.publicChatUsers.delete(userId);
    const userInfo = this.userSessions.get(userId);
    if (userInfo) {
      this.logActivity(`User ${userInfo.name} left public chat`, 'public-chat');
    }
  }

  addPublicChatMessage(userId, message) {
    const userInfo = this.userSessions.get(userId);
    if (!userInfo) return null;

    const messageData = {
      id: Date.now() + Math.random(),
      userId,
      username: userInfo.name,
      message: this.filterMessage(message),
      timestamp: new Date(),
      type: 'message'
    };

    this.publicChatMessages.push(messageData);
    this.stats.publicChatMessages++;
    this.stats.totalMessages++;

    // Keep only last 1000 messages
    if (this.publicChatMessages.length > 1000) {
      this.publicChatMessages = this.publicChatMessages.slice(-1000);
    }

    this.logActivity(`Public chat message from ${userInfo.name}`, 'public-chat');
    return messageData;
  }

  getPublicChatUsers() {
    const users = [];
    this.publicChatUsers.forEach(userId => {
      const userInfo = this.userSessions.get(userId);
      if (userInfo) {
        users.push({
          id: userId,
          name: userInfo.name,
          joinedAt: userInfo.joinedAt
        });
      }
    });
    return users;
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
  chatManager.stats.usersConnected++;
  
  // Handle admin authentication
  socket.on('admin-auth', (token) => {
    if (token === adminCredentials.token) {
      chatManager.addAdmin(socket.id);
      socket.emit('admin-authenticated');
      
      // Send initial data
      socket.emit('admin-stats', chatManager.getStats());
      socket.emit('admin-users', chatManager.getUsers());
      socket.emit('admin-chats', chatManager.getActiveChats());
      socket.emit('admin-activity', chatManager.activityLog);
      
      chatManager.logActivity('Admin logged in', 'admin');
    } else {
      socket.emit('admin-auth-failed');
    }
  });
  
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
    if (chatManager.maintenanceMode) {
      socket.emit('error', { message: 'Site is under maintenance. Please try again later.' });
      return;
    }

    chatManager.addWaitingUser(socket.id, userInfo);
    chatManager.logActivity(`User ${userInfo.name} is looking for a partner`, 'user');
    
    const match = chatManager.findMatch(socket.id);
    if (match) {
      const { partnerId, sessionId } = match;
      
      // Notify both users they are connected
      socket.emit('partner-found', { sessionId, partnerId });
      socket.to(partnerId).emit('partner-found', { sessionId, partnerId: socket.id });
      
      // Join both users to a room
      socket.join(sessionId);
      io.sockets.sockets.get(partnerId)?.join(sessionId);
      
      chatManager.stats.sessionsCreated++;
      chatManager.logActivity(`Chat session created: ${sessionId.substring(0, 8)}`, 'match');
      
      console.log(`Match found: ${socket.id} <-> ${partnerId} in session ${sessionId}`);
    } else {
      socket.emit('waiting-for-partner');
    }
  });

  // Handle joining public chat
  socket.on('join-public-chat', () => {
    if (chatManager.maintenanceMode) {
      socket.emit('error', { message: 'Site is under maintenance. Please try again later.' });
      return;
    }

    const recentMessages = chatManager.joinPublicChat(socket.id, userInfo);
    socket.join('public-chat');
    
    socket.emit('public-chat-joined', {
      messages: recentMessages,
      users: chatManager.getPublicChatUsers()
    });

    // Notify other users
    socket.to('public-chat').emit('user-joined-public', {
      userId: socket.id,
      username: userInfo.name
    });

    // Update user count for all public chat users
    io.to('public-chat').emit('public-chat-users', chatManager.getPublicChatUsers());
  });

  // Handle leaving public chat
  socket.on('leave-public-chat', () => {
    chatManager.leavePublicChat(socket.id);
    socket.leave('public-chat');
    
    // Notify other users
    socket.to('public-chat').emit('user-left-public', {
      userId: socket.id,
      username: userInfo.name
    });

    // Update user count
    io.to('public-chat').emit('public-chat-users', chatManager.getPublicChatUsers());
  });

  // Handle public chat messages
  socket.on('send-public-message', (data) => {
    if (chatManager.maintenanceMode) {
      socket.emit('error', { message: 'Site is under maintenance.' });
      return;
    }

    const { message } = data;
    
    // Validate message
    if (!message || message.trim().length === 0 || message.length > 500) {
      socket.emit('error', { message: 'Invalid message' });
      return;
    }

    // Check if user is in public chat
    if (!chatManager.publicChatUsers.has(socket.id)) {
      socket.emit('error', { message: 'You are not in the public chat' });
      return;
    }

    // Check for banned content
    if (chatManager.containsBannedContent(message)) {
      socket.emit('error', { message: 'Message contains inappropriate content' });
      chatManager.logActivity(`Inappropriate public message blocked from ${userInfo.name}`, 'moderation');
      return;
    }

    const messageData = chatManager.addPublicChatMessage(socket.id, message.trim());
    if (messageData) {
      // Broadcast to all public chat users
      io.to('public-chat').emit('public-message-received', messageData);
    }
  });

  // Handle sending messages
  socket.on('send-message', (data) => {
    if (chatManager.maintenanceMode) {
      socket.emit('error', { message: 'Site is under maintenance.' });
      return;
    }

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

    // Check for banned content
    if (chatManager.containsBannedContent(message)) {
      socket.emit('error', { message: 'Message contains inappropriate content' });
      chatManager.logActivity(`Inappropriate message blocked from ${userInfo.name}`, 'moderation');
      return;
    }

    // Filter message content
    const filteredMessage = chatManager.filterMessage(message.trim());
    
    // Increment message count
    chatManager.incrementMessageCount(sessionId);
    chatManager.stats.totalMessages++;
    
    const messageData = {
      message: filteredMessage,
      timestamp: new Date().toISOString(),
      senderId: socket.id
    };

    // Send to all users in the session
    io.to(sessionId).emit('receive-message', messageData);
    
    // Log activity
    chatManager.logActivity(`Message sent in session ${sessionId.substring(0, 8)}`, 'message');
    
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
    
    // Log admin disconnect
    if (chatManager.adminSockets.has(socket.id)) {
      chatManager.logActivity('Admin logged out', 'admin');
      chatManager.removeAdmin(socket.id);
    } else {
      // Log user disconnect
      const userInfo = chatManager.userSessions.get(socket.id);
      if (userInfo) {
        chatManager.logActivity(`User ${userInfo.name} disconnected`, 'user');
      }
    }
    
    // Handle public chat cleanup
    if (chatManager.publicChatUsers.has(socket.id)) {
      chatManager.leavePublicChat(socket.id);
      socket.to('public-chat').emit('user-left-public', {
        userId: socket.id,
        username: userInfo?.name
      });
      io.to('public-chat').emit('public-chat-users', chatManager.getPublicChatUsers());
    }
    
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

// SEO routes
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
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
  console.log(`🔧 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`🌟 WhibO - Connect. Chat. Discover.`);
});

// Real-time admin updates
setInterval(() => {
  if (chatManager.adminSockets.size > 0) {
    chatManager.broadcastToAdmins('admin-stats', chatManager.getStats());
    chatManager.broadcastToAdmins('admin-users', chatManager.getUsers());
    chatManager.broadcastToAdmins('admin-chats', chatManager.getActiveChats());
  }
}, 5000); // Update every 5 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, chatManager };
