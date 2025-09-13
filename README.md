# WhibO - Anonymous Chat Platform

A modern, secure, and responsive anonymous chat website built with Node.js and Socket.IO.

## Features

### 🚀 Core Features
- **Anonymous Chatting**: Connect with strangers without registration
- **Real-time Communication**: Instant messaging with Socket.IO
- **Mobile Responsive**: Works perfectly on all devices
- **Modern UI**: Clean, simple design that appeals to everyone
- **Progressive Web App**: Can be installed on mobile devices

### 🔒 Security Features
- **Content Filtering**: Automatic moderation of inappropriate content
- **Rate Limiting**: Protection against spam and abuse
- **XSS Protection**: Security headers and content sanitization
- **Anonymous by Design**: No personal data collection

### 👨‍💼 Admin Dashboard
- **Real-time Statistics**: Live user count, messages, sessions
- **User Management**: View active users and disconnect if needed
- **Chat Monitoring**: Monitor active conversations
- **Content Moderation**: Manage banned words and content filters
- **System Controls**: Maintenance mode, rate limiting controls
- **Activity Logs**: Track all platform activity

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "Stranger Chatting Website"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   - Main chat: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin

## Admin Access

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Token**: `admin123`

⚠️ **IMPORTANT**: Change these credentials before deploying to production!

### Admin Features
1. **Dashboard Overview**: Real-time stats and activity monitoring
2. **User Management**: View and manage connected users
3. **Chat Monitoring**: Monitor active conversations
4. **Moderation Tools**: Content filtering and user controls
5. **System Settings**: Configure banned words, rate limits, maintenance mode
6. **Activity Logs**: Track all platform events

## Deployment

### Deploy to Render.com

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Create a new Web Service
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Deploy!

3. **Environment Variables (Optional)**
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Environment (production/development)

### Deploy to Other Platforms

The app is configured to work with:
- Heroku
- Railway
- Vercel (for static hosting)
- Any Node.js hosting provider

## Project Structure

```
├── public/
│   ├── index.html          # Main chat interface
│   ├── admin.html          # Admin dashboard
│   ├── styles.css          # Main UI styles
│   ├── admin-styles.css    # Admin dashboard styles
│   ├── script.js           # Client-side chat logic
│   ├── admin-script.js     # Admin dashboard logic
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # App icons
├── server.js               # Main server file
├── package.json            # Dependencies
└── README.md               # This file
```

## Configuration

### Security Settings
- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **Message Length**: Max 500 characters
- **Content Filtering**: Automatic bad word detection
- **Session Timeout**: 30 minutes of inactivity

### Customization
- **Branding**: Update logo in `public/index.html`
- **Colors**: Modify CSS variables in `public/styles.css`
- **Content Filters**: Update banned words in admin dashboard
- **Features**: Extend functionality in `server.js`

## API Endpoints

### Public Endpoints
- `GET /` - Main chat interface
- `GET /api/health` - Health check
- `GET /api/stats` - Public statistics

### Admin Endpoints (Requires Authentication)
- `POST /admin/login` - Admin authentication
- `GET /api/admin/stats` - Detailed statistics
- `GET /api/admin/users` - Active users list
- `GET /api/admin/chats` - Active conversations
- `GET /api/admin/activity` - Activity logs
- `POST /api/admin/settings` - Update settings
- `POST /api/admin/disconnect/:userId` - Disconnect user
- `POST /api/admin/end-chat/:sessionId` - End chat session
- `POST /api/admin/end-all-chats` - End all active chats

## Socket.IO Events

### Client Events
- `find-partner` - Request to find a chat partner
- `send-message` - Send a message
- `typing` - Typing indicator
- `end-chat` - End current chat
- `admin-auth` - Admin authentication

### Server Events
- `user-info` - User information
- `partner-found` - Chat partner found
- `waiting-for-partner` - Waiting for partner
- `receive-message` - Incoming message
- `partner-typing` - Partner typing indicator
- `partner-disconnected` - Partner left
- `chat-ended` - Chat session ended
- `admin-*` - Admin dashboard events

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support or questions:
- Create an issue on GitHub
- Contact: [your-email]

---

**WhibO** - Connect. Chat. Discover. 🌟
- **Cross-platform** - Works on all devices seamlessly

### 🎨 **Modern Design**
- **Gradient UI** - Beautiful modern interface
- **Mobile-first** - Optimized for mobile devices
- **Dark/Light Mode** - Automatic theme detection
- **Accessibility** - WCAG 2.1 AA compliant
- **PWA Ready** - Install as mobile app

## Technology Stack

- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **Security**: Helmet, Express Rate Limit, CORS
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Validation**: Express Validator
- **Utils**: UUID for session management

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone/Download the project**
```bash
cd "Stranger Chatting Website"
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **Open your browser**
```
http://localhost:3000
```

### Development Mode
```bash
npm run dev
```
This starts the server with nodemon for automatic restarts during development.

## Project Structure

```
Stranger Chatting Website/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── public/                # Static files
│   ├── index.html        # Main HTML file
│   ├── styles.css        # CSS styles
│   └── script.js         # Client-side JavaScript
└── README.md             # This file
```

## API Endpoints

### REST Endpoints
- `GET /` - Serve the main chat application
- `GET /api/health` - Health check endpoint
- `GET /api/stats` - Get server statistics (active users, sessions)

### WebSocket Events

#### Client → Server
- `find-partner` - Request to find a chat partner
- `send-message` - Send a message to chat partner
- `typing` - Send typing indicator
- `end-chat` - End the current chat session

#### Server → Client
- `user-info` - User's anonymous identity information
- `waiting-for-partner` - Waiting in queue for a partner
- `partner-found` - Successfully matched with a partner
- `receive-message` - Incoming message from partner
- `partner-typing` - Partner's typing status
- `chat-ended` - Chat session has ended
- `partner-disconnected` - Partner has left the chat

## Security Features

### Rate Limiting
- 100 requests per 15 minutes per IP
- Prevents spam and abuse

### Input Validation
- Message length limits (500 characters)
- XSS protection through sanitization
- Content filtering for inappropriate language

### Session Security
- UUID-based session identifiers
- No persistent user data storage
- Automatic cleanup on disconnect

## Configuration

### Environment Variables
```bash
PORT=3000                 # Server port (default: 3000)
NODE_ENV=production      # Environment mode
```

### Customization Options

#### Modify banned words filter
Edit the `bannedWords` Set in `server.js`:
```javascript
this.bannedWords = new Set(['spam', 'abuse', 'custom-word']);
```

#### Adjust rate limiting
Modify the rate limiter configuration in `server.js`:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Time window
  max: 100,                 // Max requests
  message: 'Custom message'
});
```

#### Change message limits
Update validation in both client and server:
```javascript
// Server-side (server.js)
if (message.length > 500) { /* handle error */ }

// Client-side (script.js)
maxlength="500" // in HTML input
```

## Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
```bash
npm start
```

### Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Platform Deployment
The application is ready to deploy on:
- **Heroku**: Add `Procfile` with `web: npm start`
- **Vercel**: Works out of the box
- **Railway**: Deploy directly from repository
- **AWS/GCP/Azure**: Use Docker container or direct Node.js deployment

## Monitoring & Analytics

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Server Statistics
```bash
curl http://localhost:3000/api/stats
```

Returns:
```json
{
  "activeUsers": 25,
  "waitingUsers": 3,
  "activeSessions": 11
}
```

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Browser
- **Features**: WebSocket support required for real-time functionality

## Performance Considerations

### Client-side Optimizations
- Efficient DOM manipulation
- Debounced typing indicators
- Automatic message cleanup
- Responsive image loading

### Server-side Optimizations
- Connection pooling
- Memory-efficient session management
- Automatic cleanup of inactive sessions
- Rate limiting to prevent abuse

## Troubleshooting

### Common Issues

**Connection Problems**
- Check firewall settings
- Verify port 3000 is not blocked
- Ensure WebSocket support in browser

**Performance Issues**
- Monitor server resources
- Check for memory leaks in long-running sessions
- Review rate limiting settings

**UI Issues**
- Clear browser cache
- Check console for JavaScript errors
- Verify CSS and JS files are loading

### Debug Mode
Enable debug logging:
```bash
DEBUG=socket.io* npm start
```

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use 2 spaces for indentation
- Follow ESLint configuration
- Add comments for complex logic
- Write descriptive commit messages

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For support, feature requests, or bug reports:
1. Check the troubleshooting section
2. Review existing issues
3. Create a new issue with detailed description

## Roadmap

### Planned Features
- [ ] Private rooms with invite codes
- [ ] File/image sharing
- [ ] User reporting system
- [ ] Advanced moderation tools
- [ ] Mobile app (PWA)
- [ ] Multi-language support
- [ ] Voice chat integration
- [ ] User preferences (themes, notifications)

### Performance Improvements
- [ ] Redis for session storage
- [ ] Database integration for analytics
- [ ] CDN integration for static assets
- [ ] Load balancing for multiple instances

## Acknowledgments

- Socket.IO team for excellent real-time communication library
- Express.js team for the robust web framework
- The open-source community for inspiration and tools

---

Built with ❤️ for connecting people around the world safely and anonymously.
