'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile, getUserProfile, UserData } from './user-service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<UserData>) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<UserCredential>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      setUser(user);
      if (user) {
        try {
          const userData = await getUserProfile(user.uid);
          console.log('User profile loaded:', userData);
          setUserData(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
      
      // If user is authenticated and on auth pages, redirect to dashboard
      if (user && (window.location.pathname === '/auth/signin' || window.location.pathname === '/auth/signup')) {
        router.push('/dashboard');
      }
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, [router]);

  const signUp = async (email: string, password: string, userData: Partial<UserData>) => {
    try {
      console.log('Starting signup process with email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Firebase user created:', userCredential.user.uid);
      
      await createUserProfile(userCredential.user, userData);
      console.log('User profile created in database');
      
      setUser(userCredential.user);
      return userCredential;
    } catch (error) {
      console.error('Error in signup process:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Signing in user:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      await createUserProfile(userCredential.user, {});
      console.log('User profile updated');
      setUser(userCredential.user);
      router.push('/dashboard');
      return userCredential;
    } catch (error) {
      console.error('Error in signIn:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      await firebaseSignOut(auth);
      console.log('User logged out successfully');
      setUser(null);
      setUserData(null);
      router.push('/');
    } catch (error) {
      console.error('Error in logout:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Signing in with Google');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful');
      await createUserProfile(userCredential.user, {});
      console.log('User profile ensured');
      setUser(userCredential.user);
      // Note: caller now handles post-sign-in navigation
      return userCredential;
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 