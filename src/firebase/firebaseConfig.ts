// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

//  web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCwqmh0cOhjn2S7g9jFm9nOUTQTDkBW8zg",
  authDomain: "customlearning-d63bf.firebaseapp.com",
  databaseURL: "https://customlearning-d63bf-default-rtdb.firebaseio.com",
  projectId: "customlearning-d63bf",
  storageBucket: "customlearning-d63bf.firebasestorage.app",
  messagingSenderId: "458988123017",
  appId: "1:458988123017:web:4bc6435754d21eb77d6758",
  measurementId: "G-18MGTZ0CSG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firebaseApp = app;
export default firebaseConfig;
export const db = getFirestore(app);
export const storage = getStorage(app);