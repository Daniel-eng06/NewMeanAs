import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage} from "firebase/storage";
import { getAnalytics } from "firebase/analytics";


// Customize with your Firebase project configuration
const firebaseConfig = {

};


const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { signOut, onAuthStateChanged};


