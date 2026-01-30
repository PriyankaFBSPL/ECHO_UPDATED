import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile, CEFRLevel, ChatMessage, VocabWord, Translation, ScreenName, SkillStats } from './types';

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
}

// Helper for session expiration (7 days to avoid frequent logouts)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

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
      login: (name, avatar) => set({
        user: {
          name,
          avatar,
          cefrLevel: CEFRLevel.A1,
          streak: 1,
          lastLogin: Date.now(),
          wordsLearned: 0
        },
        currentScreen: 'dashboard'
      }),
      logout: () => set({ user: null, currentScreen: 'login' }),
      checkSession: () => {
        const { user, logout } = get();
        if (user) {
          const now = Date.now();
          if (now - user.lastLogin > SESSION_DURATION) {
            // Expired
            logout(); 
          } else {
            // Refresh session timestamp to keep it alive
            set({ user: { ...user, lastLogin: now } });
          }
        }
      },

      chatHistory: [],
      addMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [] }),

      vocabulary: [],
      addVocab: (words) => set((state) => {
        return { vocabulary: [...state.vocabulary, ...words] };
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
      updateStats: (newStats) => set((state) => ({ stats: { ...state.stats, ...newStats } }))
    }),
    {
      name: 'echo-storage',
      storage: createJSONStorage(() => localStorage), 
    }
  )
);