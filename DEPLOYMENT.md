# Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Firebase Hosting (Recommended)
Firebase provides the full backend infrastructure including database, authentication, and cloud functions.

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init

# Set OpenAI API key
firebase functions:config:set openai.api_key="your_openai_api_key_here"

# Deploy everything
firebase deploy
```

### Option 2: Vercel (Frontend only)
Great for the static website, but you'll need Firebase for backend services.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variable
vercel env add OPENAI_API_KEY
```

## 🔧 Environment Variables Needed

### For Firebase Functions:
```bash
firebase functions:config:set openai.api_key="sk-proj-..."
```

### For Vercel:
```bash
OPENAI_API_KEY=sk-proj-...
```

## 📋 Post-Deployment Checklist

### Firebase Setup:
1. ✅ Enable Authentication (Email/Password + Google)
2. ✅ Create Firestore database
3. ✅ Deploy security rules
4. ✅ Set up Cloud Functions
5. ✅ Configure custom domain (optional)

### Vercel Setup:
1. ✅ Connect GitHub repository
2. ✅ Set environment variables
3. ✅ Configure build settings
4. ✅ Set up custom domain (optional)

## 🔐 Security Notes

- API keys are secured in environment variables
- Firestore rules protect user data
- Authentication required for chat and comments
- CORS configured for cross-origin requests

## 📱 Features Working After Deployment

- ✅ User authentication (Google + Email)
- ✅ AI chat with Riley
- ✅ Real-time comments with likes
- ✅ Responsive design
- ✅ Protected routes
- ✅ Firebase backend integration

## 🐛 Troubleshooting

### Firebase Functions URL:
Update the `functionsUrl` in `chat.js` after deployment:
```javascript
this.functionsUrl = 'https://us-central1-your-project.cloudfunctions.net';
```

### CORS Issues:
Ensure your domain is added to Firebase Auth authorized domains.

### Database Rules:
Firestore rules are included and will be deployed automatically.