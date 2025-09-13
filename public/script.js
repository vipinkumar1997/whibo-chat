// Socket.IO connection
const socket = io();

// Application state
let currentScreen = 'welcome';
let currentSession = null;
let currentUser = null;
let typingTimeout = null;
let isTyping = false;

// DOM elements
const screens = {
    welcome: document.getElementById('welcomeScreen'),
    waiting: document.getElementById('waitingScreen'),
    chat: document.getElementById('chatScreen'),
    disconnected: document.getElementById('disconnectedScreen')
};

const elements = {
    startChatBtn: document.getElementById('startChatBtn'),
    cancelWaitBtn: document.getElementById('cancelWaitBtn'),
    endChatBtn: document.getElementById('endChatBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    backHomeBtn: document.getElementById('backHomeBtn'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatMessages: document.getElementById('chatMessages'),
    typingIndicator: document.getElementById('typingIndicator'),
    userName: document.getElementById('userName'),
    onlineCount: document.getElementById('onlineCount'),
    charCount: document.getElementById('charCount'),
    disconnectReason: document.getElementById('disconnectReason')
};

// Utility functions
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        currentScreen = screenName;
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function sanitizeMessage(message) {
    const div = document.createElement('div');
    div.textContent = message;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addMessage(message, isOwn = false, isSystem = false) {
    const messageDiv = document.createElement('div');
    
    if (isSystem) {
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `
            <span class="system-icon">ℹ️</span>
            ${sanitizeMessage(message)}
        `;
    } else {
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${sanitizeMessage(message)}
            </div>
            <div class="message-time">
                ${formatTime(new Date())}
            </div>
        `;
    }
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function clearChat() {
    elements.chatMessages.innerHTML = '<div class="system-message"><span class="system-icon">🎉</span>You are now connected to a stranger. Say hello!</div>';
}

function updateOnlineCount() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            elements.onlineCount.textContent = data.activeUsers || 0;
        })
        .catch(error => {
            console.error('Error fetching stats:', error);
        });
}

function updateCharCount() {
    const count = elements.messageInput.value.length;
    elements.charCount.textContent = count;
    
    if (count > 450) {
        elements.charCount.style.color = '#ef4444';
    } else if (count > 400) {
        elements.charCount.style.color = '#f59e0b';
    } else {
        elements.charCount.style.color = '#9ca3af';
    }
}

function validateMessage(message) {
    if (!message || message.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 500) {
        return { valid: false, error: 'Message is too long' };
    }
    
    return { valid: true };
}

function sendMessage() {
    const message = elements.messageInput.value.trim();
    const validation = validateMessage(message);
    
    if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
    }
    
    if (!currentSession) {
        showToast('Not connected to a chat session', 'error');
        return;
    }
    
    // Send message via socket
    socket.emit('send-message', {
        message: message,
        sessionId: currentSession
    });
    
    // Add message to UI immediately
    addMessage(message, true);
    
    // Clear input
    elements.messageInput.value = '';
    elements.sendBtn.disabled = true;
    updateCharCount();
    
    // Stop typing indicator
    if (isTyping) {
        socket.emit('typing', { sessionId: currentSession, isTyping: false });
        isTyping = false;
    }
}

function handleTyping() {
    if (!currentSession) return;
    
    // Clear existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Send typing indicator if not already typing
    if (!isTyping) {
        socket.emit('typing', { sessionId: currentSession, isTyping: true });
        isTyping = true;
    }
    
    // Set timeout to stop typing indicator
    typingTimeout = setTimeout(() => {
        if (isTyping) {
            socket.emit('typing', { sessionId: currentSession, isTyping: false });
            isTyping = false;
        }
    }, 1000);
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    updateOnlineCount();
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showToast('Disconnected from server', 'error');
    
    if (currentScreen === 'chat') {
        elements.disconnectReason.textContent = 'Connection to server lost.';
        showScreen('disconnected');
    }
});

socket.on('user-info', (userInfo) => {
    currentUser = userInfo;
    elements.userName.textContent = userInfo.name;
});

socket.on('waiting-for-partner', () => {
    showScreen('waiting');
});

socket.on('partner-found', (data) => {
    currentSession = data.sessionId;
    clearChat();
    showScreen('chat');
    showToast('Connected to a stranger!', 'success');
    elements.messageInput.focus();
});

socket.on('receive-message', (data) => {
    if (data.senderId !== socket.id) {
        addMessage(data.message, false);
    }
});

socket.on('partner-typing', (data) => {
    if (data.isTyping) {
        elements.typingIndicator.classList.add('show');
    } else {
        elements.typingIndicator.classList.remove('show');
    }
});

socket.on('chat-ended', () => {
    currentSession = null;
    elements.disconnectReason.textContent = 'The chat has ended.';
    showScreen('disconnected');
    showToast('Chat ended', 'info');
});

socket.on('partner-disconnected', () => {
    currentSession = null;
    elements.disconnectReason.textContent = 'Your chat partner has disconnected.';
    showScreen('disconnected');
    showToast('Partner disconnected', 'warning');
});

socket.on('error', (data) => {
    showToast(data.message || 'An error occurred', 'error');
});

// Event listeners
elements.startChatBtn.addEventListener('click', () => {
    socket.emit('find-partner');
});

elements.cancelWaitBtn.addEventListener('click', () => {
    showScreen('welcome');
});

elements.endChatBtn.addEventListener('click', () => {
    if (currentSession) {
        socket.emit('end-chat');
    }
});

elements.newChatBtn.addEventListener('click', () => {
    socket.emit('find-partner');
});

elements.backHomeBtn.addEventListener('click', () => {
    showScreen('welcome');
});

elements.sendBtn.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('input', (e) => {
    const hasContent = e.target.value.trim().length > 0;
    elements.sendBtn.disabled = !hasContent;
    updateCharCount();
    
    if (hasContent && currentSession) {
        handleTyping();
    }
});

elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!elements.sendBtn.disabled) {
            sendMessage();
        }
    }
});

// Prevent form submission on Enter
elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
    }
});

// Update online count periodically
setInterval(updateOnlineCount, 30000);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showScreen('welcome');
    updateOnlineCount();
    
    // Focus message input when chat screen is shown
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (screens.chat.classList.contains('active')) {
                    setTimeout(() => {
                        elements.messageInput.focus();
                    }, 100);
                }
            }
        });
    });
    
    observer.observe(screens.chat, { attributes: true });
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, user might have switched tabs
        if (isTyping && currentSession) {
            socket.emit('typing', { sessionId: currentSession, isTyping: false });
            isTyping = false;
        }
    } else {
        // Page is visible again
        updateOnlineCount();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (currentSession) {
        socket.emit('end-chat');
    }
});

// Responsive design helper
function handleResize() {
    if (window.innerWidth <= 768) {
        // Mobile adjustments
        if (currentScreen === 'chat') {
            scrollToBottom();
        }
    }
}

window.addEventListener('resize', handleResize);

// Error handling for development
window.addEventListener('error', (error) => {
    console.error('JavaScript error:', error);
    showToast('An unexpected error occurred', 'error');
});

// Service worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker can be added here for offline functionality
    });
}

// Accessibility improvements
document.addEventListener('keydown', (e) => {
    // Escape key to end chat or go back
    if (e.key === 'Escape') {
        if (currentScreen === 'chat' && currentSession) {
            elements.endChatBtn.click();
        } else if (currentScreen === 'waiting') {
            elements.cancelWaitBtn.click();
        }
    }
});

// Performance optimization: Lazy load features
const lazyFeatures = {
    notifications: null,
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    },
    
    showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            return new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }
    }
};

// Initialize lazy features when needed
socket.on('receive-message', () => {
    if (document.hidden) {
        lazyFeatures.showNotification('New message', {
            body: 'You received a new message in your chat',
            tag: 'new-message'
        });
    }
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showScreen,
        showToast,
        sanitizeMessage,
        formatTime,
        validateMessage
    };
}
