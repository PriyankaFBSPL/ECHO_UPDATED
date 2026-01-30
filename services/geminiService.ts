import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, VocabWord, CEFRLevel } from '../types';

// Defensive check to prevent crash if process is undefined in browser
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || ''; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

const ECHO_SYSTEM_PROMPT = `
You are ECHO, an advanced AI English tutor designed for immersive voice conversation.
Your goal is to simulate a natural, fluid conversation with the user.

CRITICAL INSTRUCTIONS:
1. **Be Concise**: Keep responses short (1-3 sentences) to allow for a back-and-forth dialogue. Do not monologue.
2. **Be Natural**: Use fillers (like "I see," "That's interesting," "Hmm") occasionally to sound human.
3. **Correction Strategy**: Do NOT correct every single mistake. Only correct major grammar errors that impede understanding, and do so gently at the end of your response.
4. **Engagement**: Always end your turn with a relevant follow-up question to keep the user speaking.
5. **Adaptability**: Adjust your vocabulary complexity based on the user's CEFR level.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
      response: { type: Type.STRING, description: "The natural conversational response from ECHO." },
      correction: {
          type: Type.OBJECT,
          description: "Optional correction if the user made a mistake.",
          nullable: true,
          properties: {
              original: { type: Type.STRING },
              corrected: { type: Type.STRING },
              explanation: { type: Type.STRING }
          }
      }
  }
};

const STARTER_TOPICS = [
    "travel and dream destinations",
    "the impact of technology on daily life",
    "memorable childhood experiences",
    "food, cooking, and favorite cuisines",
    "movies, books, or storytelling",
    "fitness, health, and well-being",
    "music and how it affects mood",
    "future goals and aspirations"
];

export const startChatSession = async (userName: string, level: string): Promise<{ text: string }> => {
  if (!API_KEY) return { text: `Hello ${userName}! I'm ECHO. Ready to practice?` };

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: ECHO_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const randomTopic = STARTER_TOPICS[Math.floor(Math.random() * STARTER_TOPICS.length)];

    const result = await chat.sendMessage({ 
      message: `[SYSTEM_INIT] The user is ${userName}, CEFR Level ${level}. 
      Initiate the conversation warmly by name. 
      Instead of a generic greeting, jump straight into a casual conversation about: "${randomTopic}".
      Ask an open-ended question to get them talking.` 
    });

    let responseText = result.text?.replace(/```json\n?|```/g, '').trim() || '{}';
    const json = JSON.parse(responseText);
    return { text: json.response || "Hello! Ready to start?" };

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
      2. Enhanced English (using more advanced vocabulary).
      3. An example of how to use the enhanced version in an Indian context.
      
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
            contents: `Generate 3 distinct, advanced English vocabulary words that are sophisticated and not in common daily use (thesaurus-level/GRE level). 
            Focus on words that enhance articulation and are considered 'rare' or 'literary' but useful for high-level expression.
            Include an example specifically relevant to an Indian context (e.g., festivals, food, daily life in India).`,
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
}