export type ScreenName = 'login' | 'dashboard' | 'practice' | 'vocabulary' | 'progress' | 'translator';

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

export interface UserProfile {
  name: string;
  avatar: string;
  cefrLevel: CEFRLevel;
  streak: number;
  lastLogin: number; // timestamp
  wordsLearned: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  correction?: {
    original: string;
    corrected: string;
    explanation: string;
  };
}

export interface VocabWord {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  indianContextExample: string;
  status: 'new' | 'reviewing' | 'mastered';
  lastReviewed: number;
}

export interface Translation {
  id: string;
  original: string;
  simple: string;
  enhanced: string;
  context: string;
  timestamp: number;
  isFavorite: boolean;
}

export interface SkillStats {
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
}
