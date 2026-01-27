import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Mic, Volume2, RotateCcw, StopCircle, MessageCircle } from 'lucide-react';
import { sendMessageToTutor, startChatSession } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

const ChatScreen: React.FC = () => {
  const { chatHistory, addMessage, clearChat, user } = useStore();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Load voices reliably
  useEffect(() => {
    const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Auto-Start Conversation
  useEffect(() => {
    const initChat = async () => {
      // Only start if history is empty and we haven't already started in this session mount
      if (chatHistory.length === 0 && !hasInitialized.current && !isLoading) {
        hasInitialized.current = true;
        setIsLoading(true);
        
        try {
            // Slight delay to allow UI to settle before AI 'thinks'
            await new Promise(r => setTimeout(r, 500));
            
            const response = await startChatSession(user?.name || 'User', user?.cefrLevel || 'A1');
            
            const botMsg = {
                id: Date.now().toString(),
                role: 'model' as const,
                text: response.text,
                timestamp: Date.now()
            };
            
            addMessage(botMsg);
            speak(response.text);
        } catch (e) {
            console.error("Init failed", e);
        } finally {
            setIsLoading(false);
        }
      }
    };
    
    initChat();
  }, [chatHistory.length, user, addMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      text: inputText,
      timestamp: Date.now()
    };

    addMessage(userMsg);
    setInputText('');
    setIsLoading(true);

    try {
        const response = await sendMessageToTutor(chatHistory, userMsg.text);

        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: 'model' as const,
          text: response.text,
          timestamp: Date.now(),
          correction: response.correction
        };

        addMessage(botMsg);
        speak(response.text, response.correction);
    } catch (error) {
        console.error("Chat error", error);
        // Add a temporary error message to chat if needed, or just let user retry
    } finally {
        setIsLoading(false);
    }
  };

  const speak = (text: string, correction?: { explanation: string }) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      let textToSpeak = text;
      
      // If there is a correction, speak it first or append it to be helpful
      if (correction) {
          textToSpeak = `Here is a quick tip: ${correction.explanation}. \n\n ${text}`;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      utterance.rate = 1.0; 
      utterance.pitch = 1.1; // Slightly higher pitch for female voice
      
      // Strict Female Voice Selection
      // 1. Look for known high-quality female voices
      // 2. Look for any voice with 'female' in name
      // 3. Fallback to default
      const preferredVoice = voices.find(v => 
        ['samantha', 'zira', 'victoria', 'karen', 'moira', 'google us english'].some(name => v.name.toLowerCase().includes(name)) && 
        !v.name.toLowerCase().includes('male') // Exclude if explicitly male
      ) || voices.find(v => v.name.toLowerCase().includes('female'));

      if (preferredVoice) {
          utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Voice input not supported in this environment.");
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full pb-20"> 
      {/* Cinematic Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-lg border border-white/20 shadow-glow-sm">
                👩‍🚀
             </div>
             <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-black animate-pulse"></div>
          </div>
          <div>
            <h2 className="font-bold text-white tracking-wide">ECHO</h2>
            <p className="text-[10px] text-primary uppercase tracking-widest font-semibold">Active Session</p>
          </div>
        </div>
        <button 
            onClick={() => {
                hasInitialized.current = false; // Reset init flag so it can start again if cleared
                clearChat();
            }} 
            className="p-2 text-gray-500 hover:text-white transition-colors"
        >
            <RotateCcw size={20} />
        </button>
      </div>

      {/* Messages Area - Flex Grow to take remaining space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" ref={scrollRef}>
        {chatHistory.length === 0 && isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
                 <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                 <p className="text-gray-400 text-sm animate-pulse">Establishing Uplink...</p>
            </div>
        )}
        
        {chatHistory.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
                <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4">
                    <MessageCircle size={32} className="text-white" />
                </div>
                <p className="text-white font-mono text-sm">System Ready.</p>
            </div>
        )}
        
        <AnimatePresence initial={false}>
            {chatHistory.map((msg) => (
            <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
                <div className={`max-w-[85%] rounded-2xl p-5 relative ${
                msg.role === 'user' 
                    ? 'bg-primary/90 text-white rounded-br-none shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                    : 'bg-white/5 backdrop-blur-md border border-white/10 text-gray-200 rounded-bl-none'
                }`}>
                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                
                {msg.role === 'model' && (
                    <button onClick={() => speak(msg.text, msg.correction)} className="absolute -right-8 top-2 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-primary transition-colors">
                        <Volume2 size={14} />
                    </button>
                )}

                {msg.correction && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <p className="text-xs text-red-400 line-through opacity-70">{msg.correction.original}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        <p className="text-sm text-green-400 font-bold">{msg.correction.corrected}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wide">
                        Analysis: {msg.correction.explanation}
                    </p>
                    </div>
                )}
                </div>
            </motion.div>
            ))}
        </AnimatePresence>
        
        {isLoading && chatHistory.length > 0 && (
            <div className="flex justify-start">
                 <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-none flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></span>
                 </div>
            </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom of flex container */}
      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
             <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type transmission..."
                className="w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-full focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder-gray-600"
                disabled={isLoading}
            />
          </div>
          
          <button
            onClick={toggleListening}
            disabled={isLoading}
            className={`p-4 rounded-full transition-all duration-300 ${
                isListening 
                ? 'bg-red-500/20 text-red-500 border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' 
                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
          </button>
          
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-4 bg-primary text-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
