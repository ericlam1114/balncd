'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore or create if doesn't exist
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Create new user document
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
        } else {
          // Update last login
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        }

        // Set user state
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || userSnap.data()?.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign up with email/password
  const signup = async (email, password, name) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile
    await updateProfile(user, { displayName: name });
    
    // Update user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      displayName: name,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
    
    return user;
  };

  // Login with email/password
  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  // Sign out
  const logout = async () => {
    setUser(null);
    await signOut(auth);
  };

  const value = {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}