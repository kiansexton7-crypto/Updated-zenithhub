# ZenithHub - UBG Pro

A secure, feature-rich gaming platform with chat, friends, and media streaming capabilities.

## 🔒 Security Improvements Implemented

### 1. Input Sanitization
- **DOMPurify** integrated for XSS protection
- All user input is sanitized before rendering
- Fallback to basic escaping if DOMPurify unavailable (offline mode)

### 2. Firebase Security Rules
- **Rate limiting** enforced server-side
- **Message size limits** (500 chars text, 10KB document)
- **User authorization** checks on all operations
- **Room code validation** prevents unauthorized access
- **Member-only access** for private rooms and DMs

### 3. Cloud Functions
- Server-side room code validation
- Server-side room creation with collision detection
- Automatic message cleanup (every 60 minutes)
- Firebase config proxy for API key hiding

### 4. Firebase Storage for Images
- Images uploaded to Firebase Storage instead of Base64
- Reduces Firestore costs (Base64 is expensive)
- Automatic offline fallback to Base64 when Storage unavailable
- 5MB upload limit with compression
- User-isolated storage paths

### 5. Environment Variable Support
- Firebase config can be loaded from environment variables
- Proxy API endpoint for secure config serving
- **Offline fallback** ensures app works without backend
- Download as zip, extract, and open index.html works offline

## 🚀 Deployment Guide

### Option 1: Firebase Hosting (Recommended)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**
   ```bash
   firebase login
   firebase init
   ```
   - Select: Hosting, Firestore, Storage, Functions
   - Use existing project: `ubgpro`

3. **Deploy Security Rules**
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

4. **Deploy Functions**
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

5. **Deploy Hosting**
   ```bash
   firebase deploy --only hosting
   ```

### Option 2: Vercel/Netlify

1. **Build the project**
   - The project is already built (static HTML/CSS/JS)
   - No build step needed

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Set Environment Variables** (for production)
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

## 📦 Offline Usage

The app works completely offline! Simply:
1. Download the project as a zip
2. Extract to any folder
3. Open `index.html` in your browser

**Features that work offline:**
- All games
- Anime and movie streaming (uses external APIs)
- UI navigation
- Local storage persistence

**Features requiring internet:**
- Chat (requires Firebase)
- Authentication (requires Firebase)
- Image uploads (requires Firebase Storage)

## 🔧 Configuration

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select/create project: `ubgpro`
3. Enable Authentication (Email/Password)
4. Create Firestore database
5. Enable Storage
6. Deploy the provided security rules

### Security Rules Deployment

```bash
# Firestore Rules
firebase firestore:rules:upload firestore.rules
firebase firestore:rules:release

# Storage Rules
firebase storage:rules:upload storage.rules
firebase storage:rules:release
```

### Functions Deployment

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 📁 Project Structure

```
Updated-zenithhub/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styles
├── js/
│   ├── firebase-config.js  # Firebase config with env support
│   ├── auth.js            # Authentication
│   ├── chat.js            # Chat, rooms, DMs, friends
│   ├── games.js           # Game library
│   ├── anime.js           # Anime streaming
│   ├── movies.js          # Movies/TV streaming
│   ├── cloak.js           # Stealth tab feature
│   └── app.js             # Core app logic
├── functions/
│   ├── index.js           # Cloud Functions
│   └── package.json       # Functions dependencies
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
└── README.md              # This file
```

## 🛡️ Security Features Summary

| Feature | Implementation |
|---------|---------------|
| XSS Protection | DOMPurify sanitization |
| Rate Limiting | Firestore Security Rules + Cloud Functions |
| Input Validation | Client-side + Server-side |
| API Key Protection | Environment variables + Proxy |
| Image Security | Firebase Storage with rules |
| Message Size Limits | Security Rules (500 chars, 10KB) |
| Room Code Validation | Cloud Functions server-side |
| Offline Fallback | Automatic fallback for all features |

## 📝 API Keys

**For Production:**
Set Firebase config as environment variables or use the proxy endpoint.

**For Development/Offline:**
The hardcoded config in `firebase-config.js` works as a fallback.

## 🎮 Features

- **100+ Unblocked Games** - Instant play, no downloads
- **Global Chat** - Real-time messaging with reactions
- **Private Rooms** - Create/join with room codes
- **Direct Messages** - Private conversations
- **Friends System** - Send/receive friend requests
- **Anime Streaming** - Watch anime episodes
- **Movies & TV** - Stream popular content
- **Stealth Tab** - Disguise the tab with presets
- **Panic Key** - Quick redirect to safe site

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational purposes only.

## ⚠️ Disclaimer

This project is a gaming platform for entertainment. Users are responsible for their own usage. The developers are not responsible for any misuse.