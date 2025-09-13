# WhibO - Anonymous Chat Platform

🌟 **Connect. Chat. Discover.** - A modern, secure, anonymous chatting platform built for instant connections worldwide.

![WhibO Logo](https://img.shields.io/badge/WhibO-Chat%20Platform-blue?style=for-the-badge&logo=chat&logoColor=white)

## ✨ Features

### 🔐 **Privacy & Security**
- **100% Anonymous** - No registration, no personal data
- **End-to-end Encryption** - Secure message transmission
- **Auto-delete Messages** - No chat history stored
- **IP Protection** - Advanced privacy measures
- **Content Filtering** - AI-powered inappropriate content detection

### ⚡ **Real-time Experience**
- **Instant Matching** - Find chat partners in seconds
- **Live Typing Indicators** - See when someone is typing
- **Connection Status** - Real-time online user count
- **Smooth Animations** - Modern, fluid UI interactions
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
