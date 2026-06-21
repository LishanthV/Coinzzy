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
  login: (email: string, name?: string) => Promise<{ error: Error | null }>;
  logOut: () => Promise<void>;
  updateProfile: (changes: Partial<Omit<UserProfile, 'id' | 'email'>>) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      isAuthenticated: false,
      user: null,
      notificationsEnabled: false,

      completeOnboarding: () => set({ hasOnboarded: true }),

      // Action: Direct authentication (instantly log in user)
      login: async (email, name) => {
        try {
          console.log(`[Auth Store] Direct login for email: ${email}, name: ${name}`);
          set({
            isAuthenticated: true,
            hasOnboarded: true,
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
          console.error('[Auth Store] login Error:', error);
          return { error: error || new Error('Failed to log in.') };
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
