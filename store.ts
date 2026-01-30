import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile, CEFRLevel, ChatMessage, VocabWord, Translation, ScreenName, SkillStats, DetailedReport } from './types';

interface AppState {
  // UI State
  currentScreen: ScreenName;
  setScreen: (screen: ScreenName) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isVocabLoading: boolean;
  setVocabLoading: (loading: boolean) => void;
  
  // User State
  user: UserProfile | null;
  login: (name: string, avatar: string) => void;
  logout: () => void;
  checkSession: () => void;

  // Data State
  chatHistory: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  vocabulary: VocabWord[];
  addVocab: (words: VocabWord[]) => void;
  updateVocabStatus: (id: string, status: VocabWord['status']) => void;

  translations: Translation[];
  addTranslation: (t: Translation) => void;
  toggleFavoriteTranslation: (id: string) => void;

  stats: SkillStats;
  updateStats: (newStats: Partial<SkillStats>) => void;
  
  latestReport: DetailedReport | null;
  setLatestReport: (report: DetailedReport) => void;
}

// Helper for session expiration (7 days to avoid frequent logouts)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

const getTodayString = () => new Date().toISOString().split('T')[0];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentScreen: 'login',
      setScreen: (screen) => set({ currentScreen: screen }),
      
      // Defaulting to TRUE for cinematic look
      isDarkMode: true,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      isVocabLoading: false,
      setVocabLoading: (loading) => set({ isVocabLoading: loading }),

      user: null,
      login: (name, avatar) => {
        // Simple login logic for new/returning users
        // Note: In a real app, we would look up the user by ID. 
        // Here, we treat every login on this device as the current user, 
        // but we reset if the name is different or just initialize.
        
        const today = getTodayString();
        
        set({
          user: {
            name,
            avatar,
            cefrLevel: CEFRLevel.A1,
            streak: 1, // Start at 1 for today
            lastLogin: Date.now(),
            lastLoginDate: today,
            wordsLearned: 0
          },
          currentScreen: 'dashboard',
          // Clear history for a "Fresh" session feel upon new login
          chatHistory: [],
          vocabulary: [], // Optional: Keep vocab if you want persistence, reset if you want "New User" feel
          translations: [],
          latestReport: null,
          stats: { grammar: 20, vocabulary: 15, fluency: 10, pronunciation: 10 }
        });
      },

      logout: () => set({ 
        user: null, 
        currentScreen: 'login',
        chatHistory: [], 
        vocabulary: [],
        translations: [],
        latestReport: null
      }),

      checkSession: () => {
        const { user, logout } = get();
        if (user) {
          const now = Date.now();
          const today = getTodayString();
          
          // 1. Check Expiry
          if (now - user.lastLogin > SESSION_DURATION) {
            logout(); 
            return;
          }

          // 2. Calculate Streak
          let newStreak = user.streak;
          
          if (user.lastLoginDate !== today) {
            const lastLoginDate = new Date(user.lastLoginDate);
            const currentDate = new Date(today);
            
            // Calculate difference in days
            const diffTime = Math.abs(currentDate.getTime() - lastLoginDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays === 1) {
              // Consecutive day
              newStreak += 1;
            } else if (diffDays > 1) {
              // Missed a day (or more), reset to 1 (today)
              newStreak = 1;
            }
            // If diffDays === 0, it's same day, do nothing
          }

          // Update user state
          set({ 
            user: { 
              ...user, 
              lastLogin: now,
              lastLoginDate: today,
              streak: newStreak
            } 
          });
        }
      },

      chatHistory: [],
      addMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [] }),

      vocabulary: [],
      addVocab: (words) => set((state) => {
        // Prevent duplicates
        const newWords = words.filter(nw => !state.vocabulary.some(ew => ew.word === nw.word));
        return { vocabulary: [...state.vocabulary, ...newWords] };
      }),
      updateVocabStatus: (id, status) => set((state) => ({
        vocabulary: state.vocabulary.map(w => w.id === id ? { ...w, status, lastReviewed: Date.now() } : w)
      })),

      translations: [],
      addTranslation: (t) => set((state) => ({ translations: [t, ...state.translations] })),
      toggleFavoriteTranslation: (id) => set((state) => ({
        translations: state.translations.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)
      })),

      stats: { grammar: 20, vocabulary: 15, fluency: 10, pronunciation: 10 },
      updateStats: (newStats) => set((state) => ({ stats: { ...state.stats, ...newStats } })),
      
      latestReport: null,
      setLatestReport: (report) => set({ latestReport: report }),
    }),
    {
      name: 'echo-storage',
      storage: createJSONStorage(() => localStorage), 
    }
  )
);