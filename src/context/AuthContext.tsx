import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type FirebaseUser,
} from '../firebase';
import {
  subscribeUsers,
  upsertUserInFirestore,
  updateUserProfileInFirestore,
  deleteUserFromFirestore,
  updateUserWorkspaceRoleInFirestore,
  getUserFromFirestore,
} from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  users: User[];
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    title?: string,
    role?: 'admin' | 'manager' | 'member'
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  createUser: (userData: Partial<User>) => Promise<User>;
  updateCurrentUserProfile: (updates: Partial<User>) => Promise<void>;
  sendPasswordReset: (email?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  updateWorkspaceRole: (userId: string, role: 'admin' | 'manager' | 'member') => Promise<void>;
  deleteTeamMember: (userId: string) => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Subscribe to live Firestore users list
  useEffect(() => {
    if (!firebaseUser) {
      setUsers([]);
      return;
    }

    const unsubscribe = subscribeUsers(
      (firestoreUsers) => {
        setUsers(firestoreUsers);
        // If current user is in list, refresh their details
        setCurrentUser((curr) => {
          if (!curr) return null;
          const updated = firestoreUsers.find((u) => u.id === curr.id);
          return updated || curr;
        });
      },
      (err) => {
        console.warn('Users subscription notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        let existingUser: User | null = null;
        try {
          existingUser = await getUserFromFirestore(user.uid);
        } catch (e) {
          console.warn('Error fetching existing user record:', e);
        }

        const displayName =
          existingUser?.name ||
          user.displayName ||
          user.email?.split('@')[0] ||
          (user.isAnonymous ? `Guest (${user.uid.substring(0, 5)})` : 'Collaborator');

        const avatarUrl =
          existingUser?.avatar ||
          user.photoURL ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName || user.uid)}`;

        // Map Firebase user to our User model
        const appUser: User = {
          id: user.uid,
          name: displayName,
          email: user.email || existingUser?.email || '',
          avatar: avatarUrl,
          title: existingUser?.title || (user.isAnonymous ? 'Guest Collaborator' : 'Team Member'),
          role: existingUser?.role || 'admin',
          color: existingUser?.color || '#6366f1',
          bio: existingUser?.bio || '',
          phone: existingUser?.phone || '',
          statusText: existingUser?.statusText || 'Active',
          department: existingUser?.department || 'Engineering',
          timezone: existingUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          createdAt: existingUser?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setCurrentUser(appUser);
        localStorage.setItem('pm_user_id', appUser.id);

        // Sync with Firestore collection /users/{uid}
        try {
          await upsertUserInFirestore(appUser);
        } catch (err) {
          console.warn('User firestore sync:', err);
        }
      } else {
        // Enforce real authentication: clear user and require login
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Switch active user persona (if multiple accounts are active in workspace)
  const switchUser = useCallback(
    (userId: string) => {
      const selected = users.find((u) => u.id === userId);
      if (selected) {
        setCurrentUser(selected);
        localStorage.setItem('pm_user_id', selected.id);
      }
    },
    [users]
  );

  // Sign In with Email & Password
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Firebase signIn error:', err);
      let msg = err.message || 'Failed to sign in';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  // Sign Up with Email & Password
  const signUpWithEmail = useCallback(
    async (
      email: string,
      pass: string,
      name: string,
      title: string = 'Software Engineer',
      role: 'admin' | 'manager' | 'member' = 'member'
    ) => {
      setAuthError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
        await updateProfile(cred.user, {
          displayName: name,
          photoURL: avatarUrl,
        });

        const newUser: User = {
          id: cred.user.uid,
          name,
          email,
          avatar: avatarUrl,
          title,
          role,
          color: '#6366f1',
        };

        await upsertUserInFirestore(newUser);
        setCurrentUser(newUser);
        setAuthModalOpen(false);
      } catch (err: any) {
        console.error('Firebase signUp error:', err);
        let msg = err.message || 'Failed to create account';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'An account with this email address already exists. Please sign in instead.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'Password is too weak. Please use at least 6 characters.';
        }
        setAuthError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  // Sign In with Google Popup
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const displayName = user.displayName || 'Google User';
      const appUser: User = {
        id: user.uid,
        name: displayName,
        email: user.email || '',
        avatar:
          user.photoURL ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
        title: 'Team Member',
        role: 'admin',
        color: '#6366f1',
      };
      await upsertUserInFirestore(appUser);
      setCurrentUser(appUser);
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Firebase Google Auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        const msg = err.message || 'Google authentication failed';
        setAuthError(msg);
        throw new Error(msg);
      }
    }
  }, []);

  // Instant Guest Mode (Anonymous)
  const signInGuest = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await signInAnonymously(auth);
      const guestUid = res.user.uid;
      const suffix = guestUid.substring(0, 5);
      
      const appUser: User = {
        id: guestUid,
        name: `Guest (${suffix})`,
        email: res.user.email || '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestUid}`,
        title: 'Guest Collaborator',
        role: 'member',
        color: '#10B981',
      };
      
      await upsertUserInFirestore(appUser);
      setCurrentUser(appUser);
      localStorage.setItem('pm_user_id', appUser.id);
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Guest session setup error:', err);
      let msg = err.message || 'Failed to initialize guest session';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Anonymous authentication is not enabled in your Firebase project. Please enable it in the Firebase Console under Authentication > Sign-in method.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  // Sign Out
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
      localStorage.removeItem('pm_user_id');
    } catch (err: any) {
      console.error('Firebase signOut error:', err);
    }
  }, []);

  // Create a new team user manually
  const createUser = useCallback(
    async (userData: Partial<User>): Promise<User> => {
      const id = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newUser: User = {
        id,
        name: userData.name || 'New Member',
        email: userData.email || '',
        avatar:
          userData.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name || id)}`,
        title: userData.title || 'Team Member',
        role: userData.role || 'member',
        color: userData.color || '#6366f1',
        bio: userData.bio || '',
        phone: userData.phone || '',
        statusText: userData.statusText || 'Active',
        department: userData.department || 'Engineering',
        createdAt: new Date().toISOString(),
      };

      await upsertUserInFirestore(newUser);
      setUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      localStorage.setItem('pm_user_id', newUser.id);
      return newUser;
    },
    []
  );

  // Update current user profile in Firebase Auth and Firestore
  const updateCurrentUserProfile = useCallback(
    async (updates: Partial<User>) => {
      if (!currentUser) return;
      setAuthError(null);
      try {
        // 1. If Firebase user exists and displayName/avatar updated, sync Firebase Auth
        if (auth.currentUser) {
          const authUpdates: { displayName?: string; photoURL?: string } = {};
          if (updates.name) authUpdates.displayName = updates.name;
          if (updates.avatar) authUpdates.photoURL = updates.avatar;
          if (Object.keys(authUpdates).length > 0) {
            await updateProfile(auth.currentUser, authUpdates);
          }
        }

        // 2. Update Firestore record
        const merged: User = {
          ...currentUser,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await updateUserProfileInFirestore(currentUser.id, merged);
        setCurrentUser(merged);

        // Update local users array
        setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? merged : u)));
      } catch (err: any) {
        console.error('Update profile error:', err);
        setAuthError(err.message || 'Failed to update profile');
        throw err;
      }
    },
    [currentUser]
  );

  // Send Password Reset Email
  const sendPasswordReset = useCallback(
    async (email?: string) => {
      const targetEmail = email || currentUser?.email || auth.currentUser?.email;
      if (!targetEmail) {
        throw new Error('No email address provided for password reset');
      }
      setAuthError(null);
      try {
        await sendPasswordResetEmail(auth, targetEmail);
      } catch (err: any) {
        console.error('Password reset error:', err);
        let msg = err.message || 'Failed to send password reset email';
        if (err.code === 'auth/user-not-found') {
          msg = 'No account found with this email address.';
        }
        setAuthError(msg);
        throw new Error(msg);
      }
    },
    [currentUser]
  );

  // Send Email Verification
  const sendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('No active user to verify');
    }
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      console.error('Email verification error:', err);
      let msg = err.message || 'Failed to send verification email';
      if (err.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a few moments before trying again.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  // Change Password
  const changePassword = useCallback(async (newPass: string) => {
    if (!auth.currentUser) {
      throw new Error('You must be signed in to change your password');
    }
    setAuthError(null);
    try {
      await updatePassword(auth.currentUser, newPass);
    } catch (err: any) {
      console.error('Change password error:', err);
      let msg = err.message || 'Failed to update password';
      if (err.code === 'auth/requires-recent-login') {
        msg = 'This operation is sensitive and requires recent login. Please sign out and sign back in to change your password.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  // Update Team Member's workspace role
  const updateWorkspaceRole = useCallback(
    async (userId: string, newRole: 'admin' | 'manager' | 'member') => {
      if (!currentUser) return;
      try {
        await updateUserWorkspaceRoleInFirestore(userId, newRole, currentUser);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        if (currentUser.id === userId) {
          setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
        }
      } catch (err: any) {
        console.error('Update workspace role error:', err);
        throw err;
      }
    },
    [currentUser]
  );

  // Delete Team Member from workspace
  const deleteTeamMember = useCallback(
    async (userId: string) => {
      try {
        await deleteUserFromFirestore(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (currentUser?.id === userId) {
          const remaining = users.filter((u) => u.id !== userId);
          if (remaining.length > 0) {
            setCurrentUser(remaining[0]);
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err: any) {
        console.error('Delete team member error:', err);
        throw err;
      }
    },
    [currentUser, users]
  );

  const value = useMemo(
    () => ({
      currentUser,
      firebaseUser,
      users,
      isLoading,
      authError,
      clearAuthError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInGuest,
      logout,
      switchUser,
      createUser,
      updateCurrentUserProfile,
      sendPasswordReset,
      sendVerificationEmail,
      changePassword,
      updateWorkspaceRole,
      deleteTeamMember,
      authModalOpen,
      setAuthModalOpen,
    }),
    [
      currentUser,
      firebaseUser,
      users,
      isLoading,
      authError,
      clearAuthError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInGuest,
      logout,
      switchUser,
      createUser,
      updateCurrentUserProfile,
      sendPasswordReset,
      sendVerificationEmail,
      changePassword,
      updateWorkspaceRole,
      deleteTeamMember,
      authModalOpen,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
