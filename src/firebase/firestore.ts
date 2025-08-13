import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseApp } from "./firebaseConfig";

const db = getFirestore(firebaseApp);

export const getUserData = async (uid: string) => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return null;
  }
};

export const saveUserData = async (uid: string, data: any) => {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, data, { merge: true });
};
