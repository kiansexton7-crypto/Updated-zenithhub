// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBi-PMbrCNrID4Sci2DYj7l6ewQaxIqJ4k",
  authDomain: "ubgpro.firebaseapp.com",
  projectId: "ubgpro",
  storageBucket: "ubgpro.firebasestorage.app",
  messagingSenderId: "915266692059",
  appId: "1:915266692059:web:699879598f8d9ad96cbdfe",
  measurementId: "G-GCJ09MMXEQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
