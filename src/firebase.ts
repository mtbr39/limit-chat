import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD23xZeVnU89069H1fP8fxnSpT7Sf6s1ME",
  authDomain: "chat0125.firebaseapp.com",
  projectId: "chat0125",
  storageBucket: "chat0125.firebasestorage.app",
  messagingSenderId: "639602625856",
  appId: "1:639602625856:web:722832eea29d69af89fea5",
  measurementId: "G-G6RY0VGZ5H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
