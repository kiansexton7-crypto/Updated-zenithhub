// Firebase Cloud Functions for ZenithHub
// These functions provide server-side validation and rate limiting

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Rate limiting using Firestore counters
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_WRITES_PER_MINUTE = 30;

async function checkRateLimit(userId) {
  const now = Date.now();
  const rateLimitRef = db.collection('rate_limits').doc(userId);
  const doc = await rateLimitRef.get();
  
  if (!doc.exists) {
    await rateLimitRef.set({
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  const data = doc.data();
  if (now - data.windowStart > RATE_LIMIT_WINDOW) {
    // Window expired, reset
    await rateLimitRef.set({
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  if (data.count >= MAX_WRITES_PER_MINUTE) {
    return false;
  }
  
  await rateLimitRef.update({ count: data.count + 1 });
  return true;
}

// Generate unique room code with collision detection
async function generateUniqueRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Check if code already exists
    const snapshot = await db.collection('rooms').where('code', '==', code).limit(1).get();
    if (snapshot.empty) {
      return code;
    }
    
    attempts++;
  }
  
  throw new functions.https.HttpsError('aborted', 'Could not generate unique room code');
}

// Server-side room code validation
exports.validateRoomCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
  }
  
  const username = context.auth.token.email.replace('@ubgpro.local', '').toLowerCase();
  
  // Rate limit check
  const rateLimitOk = await checkRateLimit(username);
  if (!rateLimitOk) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please wait.');
  }
  
  const { code } = data;
  
  if (!code || typeof code !== 'string' || code.length !== 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid room code format');
  }
  
  // Check if room exists
  const snapshot = await db.collection('rooms').where('code', '==', code.toUpperCase()).limit(1).get();
  if (snapshot.empty) {
    throw new functions.https.HttpsError('not-found', 'Room not found');
  }
  
  const roomDoc = snapshot.docs[0];
  const roomData = roomDoc.data();
  
  // Check if user is already a member
  if (!roomData.members.includes(username)) {
    throw new functions.https.HttpsError('permission-denied', 'You are not a member of this room');
  }
  
  return {
    roomId: roomDoc.id,
    name: roomData.name,
    code: roomData.code,
    owner: roomData.owner,
    members: roomData.members
  };
});

// Create room with server-side validation
exports.createRoom = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
  }
  
  const username = context.auth.token.email.replace('@ubgpro.local', '').toLowerCase();
  
  // Rate limit check
  const rateLimitOk = await checkRateLimit(username);
  if (!rateLimitOk) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please wait.');
  }
  
  const { name } = data;
  
  if (!name || typeof name !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Room name is required');
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 40) {
    throw new functions.https.HttpsError('invalid-argument', 'Room name must be between 2 and 40 characters');
  }
  
  // Check for duplicate names (case-insensitive)
  const duplicateCheck = await db.collection('rooms')
    .where('nameLower', '==', trimmedName.toLowerCase())
    .limit(1)
    .get();
  
  if (!duplicateCheck.empty) {
    throw new functions.https.HttpsError('already-exists', 'A room with this name already exists');
  }
  
  // Generate unique code
  const code = await generateUniqueRoomCode();
  
  // Create room
  const roomRef = await db.collection('rooms').add({
    name: trimmedName,
    nameLower: trimmedName.toLowerCase(),
    code: code,
    owner: username,
    members: [username],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    roomId: roomRef.id,
    name: trimmedName,
    code: code
  };
});

// Join room with server-side validation
exports.joinRoom = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
  }
  
  const username = context.auth.token.email.replace('@ubgpro.local', '').toLowerCase();
  
  // Rate limit check
  const rateLimitOk = await checkRateLimit(username);
  if (!rateLimitOk) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please wait.');
  }
  
  const { code } = data;
  
  if (!code || typeof code !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Room code is required');
  }
  
  const normalizedCode = code.trim().toUpperCase();
  
  // Find room by code
  const snapshot = await db.collection('rooms')
    .where('code', '==', normalizedCode)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    throw new functions.https.HttpsError('not-found', 'Room not found');
  }
  
  const roomDoc = snapshot.docs[0];
  const roomData = roomDoc.data();
  
  // Check if already a member
  if (roomData.members.includes(username)) {
    return {
      roomId: roomDoc.id,
      name: roomData.name,
      code: roomData.code,
      alreadyMember: true
    };
  }
  
  // Add user to room
  await roomDoc.ref.update({
    members: admin.firestore.FieldValue.arrayUnion(username)
  });
  
  return {
    roomId: roomDoc.id,
    name: roomData.name,
    code: roomData.code,
    alreadyMember: false
  };
});

// Delete old messages (scheduled function)
exports.cleanupOldMessages = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - (60 * 60 * 1000)); // 1 hour ago
  
  // Clean global chat
  const globalMessages = await db.collection('messages')
    .where('timestamp', '<', cutoff)
    .limit(500)
    .get();
  
  const batch = db.batch();
  globalMessages.forEach(doc => batch.delete(doc.ref));
  
  // Clean room messages
  const rooms = await db.collection('rooms').list();
  for (const roomDoc of rooms.docs) {
    const roomMessages = await db.collection('rooms')
      .doc(roomDoc.id)
      .collection('messages')
      .where('timestamp', '<', cutoff)
      .limit(100)
      .get();
    
    roomMessages.forEach(doc => batch.delete(doc.ref));
  }
  
  // Clean DMs
  const dms = await db.collection('dms').list();
  for (const dmDoc of dms.docs) {
    const dmMessages = await db.collection('dms')
      .doc(dmDoc.id)
      .collection('messages')
      .where('timestamp', '<', cutoff)
      .limit(100)
      .get();
    
    dmMessages.forEach(doc => batch.delete(doc.ref));
  }
  
  await batch.commit();
  return null;
});

// Proxy for Firebase config (optional - for hiding API keys in production)
exports.getFirebaseConfig = functions.https.onRequest(async (req, res) => {
  // This function can be used to serve Firebase config without exposing keys in client code
  // In production, you'd use environment variables here
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
  };
  
  res.json(config);
});
