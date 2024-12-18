import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage} from "firebase/storage";
import { getAnalytics } from "firebase/analytics";


// Customize with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1gasdarAAbmAsQGzdi5kKSsMi14Bkg0s",
  authDomain: "new-meanas.firebaseapp.com",
  projectId: "new-meanas",
  storageBucket: "new-meanas.appspot.com",
  messagingSenderId: "578710519258",
  appId: "1:578710519258:web:ed081153f30e3b01df94e3",
  measurementId: "G-QS495G9361"
};


const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { signOut, onAuthStateChanged};


