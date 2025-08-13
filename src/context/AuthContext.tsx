import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { firebaseApp } from "../firebase/firebaseConfig";
import { getUserData } from "../firebase/firestore";

interface User {
  uid: string;
  email: string | null;
  expiresAt?: string;
  student?: boolean;
  teacher?: boolean;
  classCode?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        const userData = await getUserData(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          expiresAt: userData?.expiresAt,
          student: userData?.student,
          teacher: userData?.teacher,
          classCode: userData?.classCode,
          name: userData?.name,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};
