import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AppUser, UserRole } from '../types';

const HACEDOR_UID = 'jhJUq4sUNDfFl78GNJRYn5CIFv02';

interface AuthContextType {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // Fetch user data from Firestore
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (user.uid === HACEDOR_UID) {
            // FORCE Hacedor status and approval
            const hacedorData: AppUser = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Hacedor',
              role: 'hacedor',
              approved: true,
              createdAt: userDoc.exists() ? userDoc.data().createdAt : new Date().toISOString()
            };
            
            if (!userDoc.exists() || userDoc.data().role !== 'hacedor' || !userDoc.data().approved) {
              await setDoc(userRef, hacedorData, { merge: true });
            }
            setUserData(hacedorData);
          } else if (userDoc.exists()) {
            setUserData(userDoc.data() as AppUser);
          } else {
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Critical Auth Error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: fullName });
      
      const role: UserRole = res.user.uid === HACEDOR_UID ? 'hacedor' : 'user';
      const newUserData: AppUser = {
        uid: res.user.uid,
        email,
        displayName: fullName,
        role,
        approved: role === 'hacedor', // Super admin is auto-approved
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', res.user.uid), newUserData);
      setUserData(newUserData);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signIn, signUp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
