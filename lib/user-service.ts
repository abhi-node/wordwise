import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  collection
} from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
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

export interface ProfilePhoto {
  uid: string;
  photoData: string; // Base64 encoded image
  contentType: string;
  uploadedAt: Date;
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

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        
        // Store in profile_photos collection
        const photoRef = doc(db, 'profile_photos', uid);
        await setDoc(photoRef, {
          uid,
          photoData: base64Data,
          contentType: file.type,
          uploadedAt: new Date()
        });
        
        // Update user profile with photo URL reference
        await updateUserProfile(uid, { photoURL: `profile_photos/${uid}` });
        
        resolve(base64Data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getProfilePhoto(uid: string): Promise<string | null> {
  try {
    const photoRef = doc(db, 'profile_photos', uid);
    const photoSnap = await getDoc(photoRef);
    
    if (photoSnap.exists()) {
      const data = photoSnap.data() as ProfilePhoto;
      return data.photoData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching profile photo:', error);
    return null;
  }
}

export async function deleteProfilePhoto(uid: string): Promise<void> {
  try {
    // For now, we'll just update the user profile to remove the photoURL
    // In a production app, you might want to actually delete the photo document
    await updateUserProfile(uid, { photoURL: '' });
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    throw error;
  }
} 