import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, VocabWord, CEFRLevel, DetailedReport } from '../types';

// Defensive check to prevent crash if process is undefined in browser
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || ''; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

const ECHO_SYSTEM_PROMPT = `
You are ECHO, a professional, CEFR-certified English Private Tutor.
Your goal is not just to chat, but to ACTIVELY TEACH through conversation.

YOUR PERSONA:
- You are warm, professional, and patient.
- You treat every interaction as a "mini-lesson".
- You adapt your vocabulary strictly to the user's CEFR level.

CRITICAL INSTRUCTION PROTOCOL:
1. **Response Structure**:
   - First, reply naturally to the conversation context (1-2 sentences).
   - Second, if the user made a grammar/vocabulary error, provide a *gentle* correction in the JSON 'correction' field.
   - Third, ask a relevant follow-up question to drive the student to speak more.

2. **Correction Strategy**:
   - **Do not** nag about every tiny mistake.
   - **Do** correct verb tense errors, preposition mistakes, and unnatural phrasing.
   - **Do** suggested "Better phrasing" for advanced users.

3. **Speaking Style**:
   - Avoid robot-like introductions. Be conversational.
   - Use questions that require more than a "Yes/No" answer.

4. **Formatting**:
   - Keep the main 'response' text clean (no markdown bolding/headings) so it can be spoken by TTS smoothly.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
      response: { type: Type.STRING, description: "The conversational reply to be spoken to the student." },
      correction: {
          type: Type.OBJECT,
          description: "Structured correction data if the student made a mistake.",
          nullable: true,
          properties: {
              original: { type: Type.STRING, description: "The user's specific text that was incorrect." },
              corrected: { type: Type.STRING, description: "The grammatically correct version." },
              explanation: { type: Type.STRING, description: "A very brief explanation of the rule (e.g., 'Use past tense here')." }
          }
      }
  }
};

const LESSON_TOPICS = [
    "discussing future career aspirations",
    "debating the pros and cons of city life vs country life",
    "describing a memorable travel experience",
    "explaining a favorite traditional dish",
    "analyzing a recent movie or book plot",
    "discussing healthy lifestyle habits",
    "environmental changes and personal impact"
];

export const startChatSession = async (userName: string, level: string): Promise<{ text: string }> => {
  if (!API_KEY) return { text: `Hello ${userName}. I am your English tutor. Let's begin our lesson.` };

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: ECHO_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const randomTopic = LESSON_TOPICS[Math.floor(Math.random() * LESSON_TOPICS.length)];

    const result = await chat.sendMessage({ 
      message: `[SYSTEM_INIT] Start a new teaching session with student: ${userName} (Level: ${level}).
      Skip pleasantries like "How are you?". 
      Jump immediately into a lesson context about: "${randomTopic}".
      Ask a specific question to gauge their level.` 
    });

    let responseText = result.text?.replace(/```json\n?|```/g, '').trim() || '{}';
    const json = JSON.parse(responseText);
    return { text: json.response || "Welcome to your English lesson. Shall we begin?" };

  } catch (error) {
    console.error("Start Session Error:", error);
    return { text: `Hello ${userName}, I am ready to help you practice English.` };
  }
};

export const sendMessageToTutor = async (
  history: ChatMessage[], 
  message: string
): Promise<{ text: string; correction?: { original: string; corrected: string; explanation: string } }> => {
  if (!API_KEY) return { text: "Please configure your API Key to chat with ECHO.", correction: undefined };

  try {
    const model = 'gemini-3-flash-preview';
    
    // Construct history for context
    const recentHistory = history.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: ECHO_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      },
      history: recentHistory as any,
    });

    const result = await chat.sendMessage({ message });
    let responseText = result.text;
    
    if (responseText) {
        // CLEANER: Remove markdown code blocks if present (common Gemini quirk)
        responseText = responseText.replace(/```json\n?|```/g, '').trim();

        try {
            const json = JSON.parse(responseText);
            return {
                text: json.response,
                correction: json.correction
            };
        } catch (e) {
            console.warn("Failed to parse JSON response, falling back to raw text:", responseText);
            return { text: responseText };
        }
    }
    
    return { text: "I'm having trouble understanding. Could you repeat that?" };

  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Sorry, I'm having trouble connecting right now. Please try again later." };
  }
};

export const translateText = async (text: string): Promise<{ simple: string; enhanced: string; context: string }> => {
  if (!API_KEY) return { simple: "Error", enhanced: "Missing API Key", context: "" };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text (which is likely Hindi or English) to English. 
      Provide two versions: 
      1. Simple English (beginner friendly).
      2. Enhanced English (professional/native level).
      3. An example of how to use the enhanced version in a professional or social context.
      
      Input Text: "${text}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            simple: { type: Type.STRING },
            enhanced: { type: Type.STRING },
            context: { type: Type.STRING }
          }
        }
      }
    });

    let cleanedText = response.text?.replace(/```json\n?|```/g, '').trim() || '{}';
    const result = JSON.parse(cleanedText);
    return result;
  } catch (error) {
    console.error(error);
    return { simple: "Error", enhanced: "Error", context: "Error processing request" };
  }
};

export const generateDailyVocab = async (level: CEFRLevel): Promise<VocabWord[]> => {
    if (!API_KEY) return [];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 3 distinct English vocabulary words suitable for a ${level} level student.
            1. Word 1: Slightly challenging.
            2. Word 2: Professional/Academic.
            3. Word 3: Idiomatic or Expressive.
            
            Include an example specifically relevant to an Indian context.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            pronunciation: { type: Type.STRING },
                            partOfSpeech: { type: Type.STRING },
                            definition: { type: Type.STRING },
                            example: { type: Type.STRING },
                            indianContextExample: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        let cleanedText = response.text?.replace(/```json\n?|```/g, '').trim() || '[]';
        const data = JSON.parse(cleanedText);
        
        return data.map((item: any, index: number) => ({
            ...item,
            id: `vocab-${Date.now()}-${index}`,
            status: 'new',
            lastReviewed: Date.now()
        }));

    } catch (error) {
        console.error("Vocab gen error", error);
        return [];
    }
};

export const evaluateProgress = async (history: ChatMessage[]): Promise<DetailedReport> => {
    if (!API_KEY) throw new Error("API Key missing");
    
    const conversationText = history
        .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
        .join('\n');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Stronger model for analysis
            contents: `You are a Senior CEFR Examiner. Analyze the following conversation transcript from an English student.
            
            Transcript:
            ${conversationText.substring(0, 10000)} // Limit context if needed
            
            Task:
            1. Evaluate Grammar, Vocabulary, Fluency, and Coherence (0-100).
            2. Determine their overall CEFR Level (A1, A2, B1, B2, C1, or C2).
            3. Identify 3 major strengths.
            4. Identify 3 specific areas for improvement (improvements).
            5. Create a short actionable plan (2-3 sentences).
            `,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grammarScore: { type: Type.INTEGER },
                        vocabularyScore: { type: Type.INTEGER },
                        fluencyScore: { type: Type.INTEGER },
                        coherenceScore: { type: Type.INTEGER },
                        overallCEFR: { type: Type.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        actionPlan: { type: Type.STRING }
                    }
                }
            }
        });

        let cleanedText = response.text?.replace(/```json\n?|```/g, '').trim() || '{}';
        const data = JSON.parse(cleanedText);
        return { ...data, generatedAt: Date.now() };

    } catch (error) {
        console.error("Evaluation Error", error);
        throw error;
    }
}