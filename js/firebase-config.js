import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-AEfq4Uie3Y-B2kSr0hBtFouT7C9BUHM",
  authDomain: "mywebproject-7a59c.firebaseapp.com",
  projectId: "mywebproject-7a59c",
  storageBucket: "mywebproject-7a59c.firebasestorage.app",
  messagingSenderId: "828330943132",
  appId: "1:828330943132:web:7606f33f76d1e24f4fc359",
  measurementId: "G-89H7RW8GGJ"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);