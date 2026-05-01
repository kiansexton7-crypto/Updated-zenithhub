// Firebase Configuration with Environment Variable Support + Offline Fallback
// For production: Set these as environment variables or use a proxy API
// For offline: Falls back to hardcoded config for local development

const getFirebaseConfig = () => {
  // Try to get config from environment variables (for production)
  if (typeof ENV_FIREBASE_API_KEY !== 'undefined') {
    return {
      apiKey: ENV_FIREBASE_API_KEY,
      authDomain: ENV_FIREBASE_AUTH_DOMAIN,
      projectId: ENV_FIREBASE_PROJECT_ID,
      storageBucket: ENV_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: ENV_FIREBASE_MESSAGING_SENDER_ID,
      appId: ENV_FIREBASE_APP_ID,
      measurementId: ENV_FIREBASE_MEASUREMENT_ID
    };
  }
  
  // Try to get config from proxy API (for production with hidden keys)
  // This allows hiding API keys while still working offline with fallback
  const proxyUrl = '/api/firebase-config';
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // In production, try to fetch from proxy
    fetch(proxyUrl)
      .then(res => res.json())
      .then(config => {
        if (config && config.apiKey) {
          window.firebaseConfigFromProxy = config;
        }
      })
      .catch(() => {
        // Silent fail - will use fallback config
      });
  }
  
  // Fallback config for offline/local development
  // This ensures the app still works when downloaded as a zip
  return {
    apiKey: "AIzaSyBi-PMbrCNrID4Sci2DYj7l6ewQaxIqJ4k",
    authDomain: "ubgpro.firebaseapp.com",
    projectId: "ubgpro",
    storageBucket: "ubgpro.firebasestorage.app",
    messagingSenderId: "915266692059",
    appId: "1:915266692059:web:699879598f8d9ad96cbdfe",
    measurementId: "G-GCJ09MMXEQ"
  };
};

const firebaseConfig = window.firebaseConfigFromProxy || getFirebaseConfig();

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
