// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyXhhXOmFByGPwpXa14Evrm7vFAfZAvBQ",
  authDomain: "isv-dcc-wedding.firebaseapp.com",
  projectId: "isv-dcc-wedding",
  storageBucket: "isv-dcc-wedding.firebasestorage.app",
  messagingSenderId: "833359665388",
  appId: "1:833359665388:web:1b898cd97cf2be6257adc9",
  measurementId: "G-LXS3565E00"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
export const db = getFirestore(app);
