import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDslJoLQ9bW3B6rev2mq1nKAVxKGoJBNRs",
  authDomain: "testing-moshysphotography-app.firebaseapp.com",
  projectId: "testing-moshysphotography-app",
  storageBucket: "testing-moshysphotography-app.firebasestorage.app",
  messagingSenderId: "709824001262",
  appId: "1:709824001262:web:5f048b2e1fd723157fafff",
  measurementId: "G-P2W1DSBP3M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;