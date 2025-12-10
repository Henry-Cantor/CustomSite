// firebase/learning.ts
import { db } from "./firebaseConfig";
import { collection, doc, setDoc, getDocs, getDoc } from "firebase/firestore";

export const getModuleProgress = async (uid: string, moduleId: string) => {
  const ref = doc(db, "users", uid, "progress", moduleId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const saveModuleProgress = async (uid: string, moduleId: string, data: any) => {
  const ref = doc(db, "users", uid, "progress", moduleId);
  await setDoc(ref, data, { merge: true });
};

export const getUserProgress = async (uid: string) => {
  const progressRef = collection(db, 'users', uid, 'progress');
  const snapshot = await getDocs(progressRef);
  const result: Record<string, { completed: boolean; score?: number | null }> = {};

  snapshot.forEach((doc) => {
    result[doc.id] = {
      completed: doc.data().completed ?? false,
      score: doc.data().score ?? null,
    };
  });

  return result;
};