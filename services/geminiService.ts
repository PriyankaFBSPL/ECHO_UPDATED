import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, VocabWord, CEFRLevel } from '../types';

const API_KEY = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

const ECHO_SYSTEM_PROMPT = `
You are ECHO, a friendly, encouraging, and highly articulate English tutor. 
Your goal is to help the user practice English conversation.
- Keep responses concise (under 50 words) unless explaining a concept.
- Correct grammar mistakes gently.
- Use sophisticated vocabulary where appropriate to challenge the user, but explain if necessary.
- If the user makes a mistake, provide the correction in a structured JSON format inside the response text if possible, or just plain text if using the chat interface.
- Adapt to the user's CEFR level.
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

    const result = await chat.sendMessage({ 
      message: `[SYSTEM_INIT] The user is ${userName}, CEFR Level ${level}. Initiate the conversation warmly by name, and ask an engaging question to start the practice session.` 
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