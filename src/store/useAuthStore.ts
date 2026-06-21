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
import { useFinanceStore } from './useFinanceStore';

interface AuthState {
  hasOnboarded: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  notificationsEnabled: boolean;
  completeOnboarding: () => void;
  signUp: (name: string, email: string, password: string) => Promise<{ error: Error | null }>;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logOut: () => Promise<void>;
  updateProfile: (changes: Partial<Omit<UserProfile, 'id' | 'email'>>) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
}

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      isAuthenticated: false,
      user: null,
      token: null,
      notificationsEnabled: false,

      completeOnboarding: () => set({ hasOnboarded: true }),

      // Action: Register a new account via MySQL backend
      signUp: async (name, email, password) => {
        try {
          console.log(`[Auth Store] SignUp requested for email: ${email}`);
          const response = await fetch(`${backendUrl}/api/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create account.');
          }

          const token = data.token;
          const user = data.user;

          // Clear local active state and fetch this user's data from MySQL backend
          useFinanceStore.getState().clearUserData();
          await useFinanceStore.getState().loadUserData(user.id, token);

          set({
            token,
            isAuthenticated: true,
            hasOnboarded: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              currency: 'USD',
              avatarColor: colors.primary,
            },
          });
          return { error: null };
        } catch (error: any) {
          console.error('[Auth Store] signUp Error:', error);
          return { error: error || new Error('Connection failed to MySQL backend.') };
        }
      },

      // Action: Login via MySQL backend
      login: async (email, password) => {
        try {
          console.log(`[Auth Store] Login requested for email: ${email}`);
          const response = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to log in.');
          }

          const token = data.token;
          const user = data.user;

          // Clear local active state and fetch this user's data from MySQL backend
          useFinanceStore.getState().clearUserData();
          await useFinanceStore.getState().loadUserData(user.id, token);

          set({
            token,
            isAuthenticated: true,
            hasOnboarded: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              currency: 'USD',
              avatarColor: colors.primary,
            },
          });
          return { error: null };
        } catch (error: any) {
          console.error('[Auth Store] login Error:', error);
          return { error: error || new Error('Connection failed to MySQL backend.') };
        }
      },

      logOut: async () => {
        // Clear active session in finance store
        useFinanceStore.getState().clearUserData();
        set({ isAuthenticated: false, user: null, token: null });
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
      name: 'coinzy-auth-v3',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        notificationsEnabled: state.notificationsEnabled,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
