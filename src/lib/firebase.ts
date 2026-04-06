// firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAiv-WY2I5hJ52ilfomEy-RYneoSkURbKE",
  authDomain: "ntel-car-marketplace.firebaseapp.com",
  projectId: "ntel-car-marketplace",
  storageBucket: "ntel-car-marketplace.appspot.com",
  messagingSenderId: "128193865805",
  appId: "1:128193865805:web:6bf42598a17f9770bed404",
  measurementId: "G-MF265W3RCL"
};

// ✅ Initialize app
const app = initializeApp(firebaseConfig);

// ✅ AUTH ADD KAR
export const auth = getAuth(app);