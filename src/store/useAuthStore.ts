import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { colors } from '../theme';
import {
  requestNotificationPermissions,
  scheduleDailyNotification,
  cancelDailyNotification,
} from '../utils/notifications';

interface AuthState {
  hasOnboarded: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  notificationsEnabled: boolean;
  completeOnboarding: () => void;
  sendOtp: (email: string, name?: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  logOut: () => Promise<void>;
  updateProfile: (changes: Partial<Omit<UserProfile, 'id' | 'email'>>) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
}

// Retrieve the backend URL from environment variables
const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      isAuthenticated: false,
      user: null,
      notificationsEnabled: false,

      completeOnboarding: () => set({ hasOnboarded: true }),

      // Action: Mock sending OTP (No longer calls Express/Nodemailer backend)
      sendOtp: async (email, name) => {
        try {
          console.log(`[Auth Store] Mock OTP request for email: ${email}, name: ${name}`);
          // Temporarily hold user details in state to verify in the next step
          set({
            user: {
              id: 'usr_' + Math.random().toString(36).substring(2, 11),
              name: name || email.split('@')[0] || 'User',
              email: email,
              currency: 'USD',
              avatarColor: colors.primary,
            },
          });
          return { error: null };
        } catch (error: any) {
          console.error('[Auth Store] sendOtp Mock Error:', error);
          return { error: error || new Error('Failed to start mock session.') };
        }
      },

      // Action: Mock verification (Accepts any 6-digit OTP code)
      verifyOtp: async (email, token) => {
        try {
          console.log(`[Auth Store] Mock verifying OTP code: ${token} for email: ${email}`);
          // Instantly authorize the user and mark onboarding as complete
          set((state) => ({
            isAuthenticated: true,
            hasOnboarded: true,
            user: state.user || {
              id: 'usr_' + Math.random().toString(36).substring(2, 11),
              name: email.split('@')[0] || 'User',
              email: email,
              currency: 'USD',
              avatarColor: colors.primary,
            },
          }));
          return { error: null };
        } catch (error: any) {
          console.error('[Auth Store] verifyOtp Mock Error:', error);
          return { error: error || new Error('Verification failed.') };
        }
      },

      logOut: async () => {
        set({ isAuthenticated: false, user: null });
      },

      updateProfile: (changes) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...changes } : state.user,
        })),

      setNotificationsEnabled: async (enabled) => {
        if (enabled) {
          const granted = await requestNotificationPermissions();
          if (granted) {
            await scheduleDailyNotification();
            set({ notificationsEnabled: true });
            return true;
          } else {
            await cancelDailyNotification();
            set({ notificationsEnabled: false });
            return false;
          }
        } else {
          await cancelDailyNotification();
          set({ notificationsEnabled: false });
          return true;
        }
      },
    }),
    {
      name: 'coinzy-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);
