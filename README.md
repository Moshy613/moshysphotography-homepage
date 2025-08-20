# Moshy Friedman Photography

A modern photography portfolio website with AI chat assistant and community features.

## Features

- 📸 **Portfolio Showcase** - Beautiful gallery of photography work
- 🤖 **AI Chat with Riley** - Photography assistant powered by OpenAI
- 💬 **Community Comments** - Real-time commenting system with likes
- 🔐 **User Authentication** - Secure login with Google and email
- 📱 **Responsive Design** - Works perfectly on all devices

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 modules)
- **Backend**: Firebase (Firestore, Auth, Functions, Hosting)
- **AI**: OpenAI GPT-3.5 Turbo
- **Styling**: Custom CSS with modern design principles

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the `functions/` directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Firebase Setup

```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 3. Deploy Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 4. Set Environment Variables in Firebase

```bash
firebase functions:config:set openai.api_key="your_openai_api_key_here"
firebase deploy --only functions
```

### 5. Deploy Website

```bash
firebase deploy
```

## Riley - AI Photography Assistant

Riley is an AI assistant that helps visitors with:
- Learning about Moshy's photography services
- Montreal photography location recommendations
- Booking information and pricing
- Photography tips and techniques
- Portfolio navigation assistance

## Security Features

- Firestore security rules protect user data
- API keys secured in Firebase environment
- Authentication required for chat and comments
- CORS protection for API endpoints

## Development

```bash
# Install dependencies
npm install

# Start local development
npm run dev

# Build for production
npm run build
```

## Contact

- **Email**: hello@moshyfriedman.com
- **Instagram**: @mtl_moshysphotogrpahy
- **Location**: Montreal, Quebec

---

Built with ❤️ for the photography community