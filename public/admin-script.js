// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.socket = io();
        this.currentSection = 'dashboard';
        this.refreshInterval = null;
        this.isAuthenticated = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocketListeners();
        this.startAutoRefresh();
        this.checkAuthentication();
    }

    checkAuthentication() {
        // Simple authentication check - in production, use proper session management
        this.token = localStorage.getItem('adminToken');
        if (!this.token) {
            this.showLoginPrompt();
        } else {
            this.isAuthenticated = true;
            this.authenticateWithServer();
        }
    }

    async authenticateWithServer() {
        // Authenticate with server using token
        this.socket.emit('admin-auth', this.token);
        
        // Set up socket authentication listeners
        this.socket.on('admin-authenticated', () => {
            this.loadDashboard();
        });
        
        this.socket.on('admin-auth-failed', () => {
            localStorage.removeItem('adminToken');
            this.showLoginPrompt();
        });
    }

    async showLoginPrompt() {
        const username = prompt('Enter admin username:') || 'admin';
        const password = prompt('Enter admin password:');
        
        if (!password) {
            window.location.href = '/';
            return;
        }

        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            if (result.success) {
                this.token = result.token;
                localStorage.setItem('adminToken', this.token);
                this.isAuthenticated = true;
                this.authenticateWithServer();
            } else {
                alert('Invalid credentials');
                window.location.href = '/';
            }
        } catch (error) {
            alert('Login failed: ' + error.message);
            window.location.href = '/';
        }
    }

    loadDashboard() {
        this.refreshStats();
        this.loadUsers();
        this.loadChats();
        this.loadActivity();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });

        // Refresh buttons
        document.getElementById('refreshActivity')?.addEventListener('click', () => this.loadActivity());
        document.getElementById('refreshUsers')?.addEventListener('click', () => this.loadUsers());
        document.getElementById('refreshChats')?.addEventListener('click', () => this.loadChats());

        // Control buttons
        document.getElementById('endAllChats')?.addEventListener('click', () => this.endAllChats());
        document.getElementById('updateBannedWords')?.addEventListener('click', () => this.updateBannedWords());
        document.getElementById('updateRateLimit')?.addEventListener('click', () => this.updateRateLimit());
        document.getElementById('maintenanceMode')?.addEventListener('click', () => this.toggleMaintenanceMode());
        document.getElementById('emergencyStop')?.addEventListener('click', () => this.emergencyStop());
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        // Search functionality
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        // Analytics timeframe
        document.getElementById('analyticsTimeframe')?.addEventListener('change', (e) => {
            this.loadAnalytics(e.target.value);
        });
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Admin connected to server');
            this.socket.emit('admin-auth', { token: 'admin123' });
        });

        this.socket.on('admin-stats', (data) => {
            this.updateStats(data);
        });

        this.socket.on('admin-activity', (activity) => {
            this.addActivity(activity);
        });

        this.socket.on('admin-users', (users) => {
            this.updateUsersTable(users);
        });

        this.socket.on('admin-chats', (chats) => {
            this.updateChatsGrid(chats);
        });
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).parentElement.classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            chats: 'Live Chat Monitor',
            moderation: 'Moderation Tools',
            analytics: 'Analytics & Reports',
            settings: 'Platform Settings'
        };
        
        const subtitles = {
            dashboard: 'Real-time overview of WhibO platform',
            users: 'Manage connected users and sessions',
            chats: 'Monitor active conversations',
            moderation: 'Content filtering and security controls',
            analytics: 'Platform usage statistics and trends',
            settings: 'Configure platform behavior and limits'
        };

        document.getElementById('pageTitle').textContent = titles[sectionName];
        document.getElementById('pageSubtitle').textContent = subtitles[sectionName];

        this.currentSection = sectionName;

        // Load section-specific data
        if (sectionName === 'analytics') {
            this.loadAnalytics();
        }
    }

    refreshStats() {
        fetch('/api/admin/stats')
            .then(response => response.json())
            .then(data => this.updateStats(data))
            .catch(error => console.error('Error fetching stats:', error));
    }

    updateStats(data) {
        document.getElementById('totalUsers').textContent = data.activeUsers || 0;
        document.getElementById('activeChats').textContent = data.activeSessions || 0;
        document.getElementById('waitingUsers').textContent = data.waitingUsers || 0;
        document.getElementById('totalMessages').textContent = data.messagesCount || 0;
        
        // Update server info
        document.getElementById('serverUptime').textContent = this.formatUptime(data.uptime);
        document.getElementById('memoryUsage').textContent = `${data.memoryUsage || 0}%`;
        document.getElementById('cpuUsage').textContent = `${data.cpuUsage || 0}%`;
    }

    loadUsers() {
        fetch('/api/admin/users')
            .then(response => response.json())
            .then(users => this.updateUsersTable(users))
            .catch(error => console.error('Error loading users:', error));
    }

    updateUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id.substring(0, 8)}...</td>
                <td>
                    <span class="status-indicator ${user.status}">
                        ${user.status === 'connected' ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>${this.formatTime(user.connectedAt)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="adminDashboard.disconnectUser('${user.id}')">
                        Disconnect
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    loadChats() {
        fetch('/api/admin/chats')
            .then(response => response.json())
            .then(chats => this.updateChatsGrid(chats))
            .catch(error => console.error('Error loading chats:', error));
    }

    updateChatsGrid(chats) {
        const grid = document.getElementById('chatsGrid');
        grid.innerHTML = '';

        if (chats.length === 0) {
            grid.innerHTML = '<p class="no-chats">No active chats</p>';
            return;
        }

        chats.forEach(chat => {
            const chatCard = document.createElement('div');
            chatCard.className = 'chat-card';
            chatCard.innerHTML = `
                <div class="chat-header">
                    <span class="chat-id">Session: ${chat.id.substring(0, 8)}</span>
                    <span class="chat-duration">${this.formatDuration(chat.duration)}</span>
                </div>
                <div class="chat-users">
                    <div class="chat-user">User 1: ${chat.user1.substring(0, 12)}</div>
                    <div class="chat-user">User 2: ${chat.user2.substring(0, 12)}</div>
                </div>
                <div class="chat-stats">
                    <small>Messages: ${chat.messageCount}</small>
                </div>
                <div class="chat-actions">
                    <button class="btn btn-danger btn-sm" onclick="adminDashboard.endChat('${chat.id}')">
                        End Chat
                    </button>
                </div>
            `;
            grid.appendChild(chatCard);
        });
    }

    loadActivity() {
        fetch('/api/admin/activity')
            .then(response => response.json())
            .then(activities => {
                const list = document.getElementById('activityList');
                list.innerHTML = '';
                
                activities.forEach(activity => {
                    const item = document.createElement('li');
                    item.className = 'activity-item';
                    item.innerHTML = `
                        <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
                        <span class="activity-text">${activity.message}</span>
                    `;
                    list.appendChild(item);
                });
            })
            .catch(error => console.error('Error loading activity:', error));
    }

    addActivity(activity) {
        const list = document.getElementById('activityList');
        const item = document.createElement('li');
        item.className = 'activity-item';
        item.innerHTML = `
            <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
            <span class="activity-text">${activity.message}</span>
        `;
        list.insertBefore(item, list.firstChild);

        // Keep only last 10 activities
        while (list.children.length > 10) {
            list.removeChild(list.lastChild);
        }
    }

    // Control functions
    disconnectUser(userId) {
        if (confirm('Are you sure you want to disconnect this user?')) {
            this.socket.emit('admin-disconnect-user', userId);
        }
    }

    endChat(chatId) {
        if (confirm('Are you sure you want to end this chat?')) {
            this.socket.emit('admin-end-chat', chatId);
        }
    }

    endAllChats() {
        if (confirm('Are you sure you want to end ALL active chats?')) {
            this.socket.emit('admin-end-all-chats');
        }
    }

    updateBannedWords() {
        const words = document.getElementById('bannedWords').value
            .split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);
        
        this.socket.emit('admin-update-banned-words', words);
        this.showNotification('Banned words updated successfully', 'success');
    }

    updateRateLimit() {
        const limit = document.getElementById('rateLimit').value;
        this.socket.emit('admin-update-rate-limit', parseInt(limit));
        this.showNotification('Rate limit updated successfully', 'success');
    }

    toggleMaintenanceMode() {
        if (confirm('Are you sure you want to toggle maintenance mode?')) {
            this.socket.emit('admin-maintenance-mode');
        }
    }

    emergencyStop() {
        if (confirm('⚠️ EMERGENCY STOP will disconnect all users and stop the server. Continue?')) {
            this.socket.emit('admin-emergency-stop');
        }
    }

    saveSettings() {
        const settings = {
            allowAnonymous: document.getElementById('allowAnonymous').checked,
            enableLogging: document.getElementById('enableLogging').checked,
            maxUsers: parseInt(document.getElementById('maxUsers').value),
            enableCaptcha: document.getElementById('enableCaptcha').checked,
            enableIPBlocking: document.getElementById('enableIPBlocking').checked,
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value)
        };

        this.socket.emit('admin-save-settings', settings);
        this.showNotification('Settings saved successfully', 'success');
    }

    searchUsers(query) {
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(query.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    loadAnalytics(timeframe = 'today') {
        // In a real implementation, this would load actual analytics data
        console.log(`Loading analytics for timeframe: ${timeframe}`);
        // For now, just show placeholder
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('adminToken');
            window.location.href = '/';
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (this.isAuthenticated) {
                this.refreshStats();
                if (this.currentSection === 'users') {
                    this.loadUsers();
                }
                if (this.currentSection === 'chats') {
                    this.loadChats();
                }
            }
        }, 10000); // Refresh every 10 seconds
    }

    // Utility functions
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }

    formatTimeAgo(timestamp) {
        const diff = Date.now() - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} min ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000',
            animation: 'slideIn 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async changeCredentials() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newUsername = document.getElementById('newUsername').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword) {
            this.showNotification('Please enter your current password', 'error');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            this.showNotification('New password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newUsername: newUsername || undefined,
                    newPassword: newPassword || undefined
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('Credentials updated successfully!', 'success');
                
                // Update token if password was changed
                if (result.newToken) {
                    this.token = result.newToken;
                    localStorage.setItem('adminToken', this.token);
                }
                
                // Clear form
                document.getElementById('currentPassword').value = '';
                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                
            } else {
                this.showNotification('Failed to update credentials: ' + result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Error updating credentials: ' + error.message, 'error');
        }
    }
}

// Initialize admin dashboard when page loads
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-chats {
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
        grid-column: 1 / -1;
    }
    
    .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.8rem;
    }
`;
document.head.appendChild(style);