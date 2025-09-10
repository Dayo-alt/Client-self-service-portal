// shared/firebase-app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD7eBbx6u7Tmi6Kr097A5yVL_NSRbsId6g",
    authDomain: "client-self-service-portal.firebaseapp.com",
    projectId: "client-self-service-portal",
    storageBucket: "client-self-service-portal.firebasestorage.app",
    messagingSenderId: "423657022971",
    appId: "1:423657022971:web:d58cd5730591b0e121175e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// expose for other scripts on the page
window.firebaseAuth = auth;