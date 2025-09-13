# WhibO Deployment Guide

## 🚀 Deploy to Render.com

### Step 1: Prepare Your Code
1. Push your code to GitHub repository
2. Make sure `package.json` has correct start script

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Connect your GitHub repository

### Step 3: Deploy Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repo
3. Use these settings:

```
Name: whibo-chat
Environment: Node
Build Command: npm install
Start Command: npm start
```

### Step 4: Environment Variables
Add these environment variables in Render dashboard:
```
NODE_ENV=production
PORT=10000
```

### Step 5: Custom Domain (Optional)
1. Buy domain from any provider
2. Add CNAME record pointing to your Render URL
3. Add custom domain in Render dashboard

## 🔧 Build Settings

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 📝 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] SSL certificate enabled
- [ ] Health check endpoint working

## 🌐 Access Your Site

Your WhibO chat will be available at:
`https://your-app-name.onrender.com`

## 📊 Monitoring

Monitor your app:
- Render Dashboard for logs and metrics
- Health endpoint: `/api/health`
- Stats endpoint: `/api/stats`
