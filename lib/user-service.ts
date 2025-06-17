import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  location?: string;
  bio?: string;
  createdAt: Date;
  lastLoginAt: Date;
  documentsCreated: number;
  wordsChecked: number;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  };
}

export async function createUserProfile(user: User, userData: Partial<UserData>): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user profile
    const newUserData: UserData = {
      uid: user.uid,
      email: user.email!,
      displayName: userData.displayName || user.email!.split('@')[0],
      phone: userData.phone || '',
      location: userData.location || '',
      bio: userData.bio || '',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      documentsCreated: userData.documentsCreated || 0,
      wordsChecked: userData.wordsChecked || 0,
      preferences: {
        theme: 'system',
        language: 'en'
      }
    };

    console.log('Creating user profile with data:', newUserData);
    await setDoc(userRef, newUserData);
  } else {
    // Update last login
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp()
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserData | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data() as UserData;
    console.log('Retrieved user profile:', data);
    return data;
  }

  return null;
}

export async function updateUserProfile(uid: string, data: Partial<UserData>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
} 