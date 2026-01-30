import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Send, Mic, Volume2, RotateCcw, StopCircle, ArrowLeft, Radio, Activity, MicOff } from 'lucide-react';
import { sendMessageToTutor, startChatSession } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

// Types for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const ChatScreen: React.FC = () => {
  const { chatHistory, addMessage, clearChat, user, setScreen } = useStore();
  const [inputText, setInputText] = useState('');
  
  // States for the Conversation Loop
  const [sessionActive, setSessionActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);

  // --- 0. Auto-Clear Chat on Mount ---
  useEffect(() => {
    clearChat();
  }, [clearChat]);

  // --- 1. Wake Lock Logic ---
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock active');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    if (sessionActive) {
      requestWakeLock();
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    }

    // Re-acquire on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [sessionActive]);

  // --- 2. Auto-Scroll ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isProcessing, isListening, isSpeaking]);

  // --- 3. Speech Recognition Setup ---
  const startListening = useCallback(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (!Recognition) return;

    // Prevent overlapping instances
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // We use continuous=false to detect the "end of a phrase" more reliably for turn-taking
    recognition.continuous = false; 

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Mic Error", event.error);
      if (event.error === 'not-allowed') {
         setSessionActive(false); // Force stop if permission denied
         alert("Microphone access denied. Please enable permissions.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Logic: If we stopped listening naturally, we check if we have text to send.
      // We need to access the LATEST state of inputText here.
      // However, React state inside closures is stale. We rely on the input value triggering a send
      // or we handle the 'final' result event.
      // Hack: We trigger the handleSend logic if we have input.
    };

    try {
        recognition.start();
    } catch (e) {
        console.error("Start failed", e);
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    setIsListening(false);
  };

  // --- 4. Text-to-Speech (TTS) ---
  const speak = useCallback((text: string, onEndCallback?: () => void) => {
    window.speechSynthesis.cancel(); // Stop anything current

    const utterance = new SpeechSynthesisUtterance(text);
    synthesisRef.current = utterance;
    
    utterance.lang = 'en-US';
    utterance.rate = 1.05; // Slightly faster for conversational flow
    utterance.pitch = 1.0;

    // Load Voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        ['samantha', 'zira', 'victoria', 'google us english'].some(name => v.name.toLowerCase().includes(name))
    ) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback(); // Fail gracefully
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // --- 5. Core Loop Logic ---
  
  // Triggered when the user hits "Start Session"
  const handleStartSession = async () => {
    setSessionActive(true);
    
    // New Session: Initialize with AI
    setIsProcessing(true);
    try {
        const response = await startChatSession(user?.name || 'User', user?.cefrLevel || 'A1');
        
        const botMsg = {
            id: Date.now().toString(),
            role: 'model' as const,
            text: response.text,
            timestamp: Date.now()
        };
        addMessage(botMsg);
        
        // AUTO-LOOP: Speak -> Then Listen
        speak(response.text, () => {
            // Wait a tiny bit before opening mic to avoid catching system echo
            setTimeout(() => startListening(), 500); 
        });

    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  // Triggered when User Sends a message (Voice or Text)
  const handleSend = async () => {
    // Prevent sending empty or duplicate sends if already processing
    if (!inputText.trim() || isProcessing) return;

    // 1. Add User Message
    const textToSend = inputText;
    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      text: textToSend,
      timestamp: Date.now()
    };
    addMessage(userMsg);
    setInputText('');
    
    // 2. Stop Mic (if running) and set Processing
    stopListening();
    setIsProcessing(true);

    try {
        // 3. Get AI Response
        const response = await sendMessageToTutor(chatHistory, textToSend);

        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: 'model' as const,
          text: response.text,
          timestamp: Date.now(),
          correction: response.correction
        };
        addMessage(botMsg);

        // 4. Speak AI Response -> Then Loop Back to Listening
        if (sessionActive) {
            speak(response.text, () => {
                setTimeout(() => startListening(), 500);
            });
        }

    } catch (error) {
        console.error("Chat error", error);
    } finally {
        setIsProcessing(false);
    }
  };

  // Effect to detect when recognition ends with text populated, to auto-send
  // This acts as the bridge between "Speech End" and "Send Message"
  useEffect(() => {
    if (!isListening && inputText.trim().length > 0 && sessionActive && !isProcessing && !isSpeaking) {
        // Debounce slightly to ensure we have the full phrase
        const timer = setTimeout(() => {
            handleSend();
        }, 1000); // 1 second silence = send
        return () => clearTimeout(timer);
    }
  }, [isListening, inputText, sessionActive, isProcessing, isSpeaking]);


  // Clean up on unmount
  useEffect(() => {
    return () => {
        window.speechSynthesis.cancel();
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-cinema-bg relative"> 
      
      {/* Overlay for Initial Start (Mobile Policy Requirement) */}
      {!sessionActive && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse"></div>
                  <button 
                    onClick={handleStartSession}
                    className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)] border-4 border-white/20 transition-transform active:scale-95 hover:scale-105"
                  >
                      <Mic size={40} className="text-white" />
                  </button>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Start Conversation</h2>
              <p className="text-gray-400 max-w-xs">Tap the microphone to begin the immersive voice session. The screen will stay active.</p>
          </div>
      )}

      {/* Cinematic Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center z-20 flex-shrink-0 pt-safe-top">
        <div className="flex items-center gap-3">
          <button 
             onClick={() => {
                 setSessionActive(false);
                 setScreen('dashboard');
             }}
             className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
             <ArrowLeft size={22} />
          </button>
          
          <div className="relative">
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm border border-white/20 shadow-glow-sm">
                👩‍🚀
             </div>
             {sessionActive && (
                 <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse"></div>
             )}
          </div>
          <div>
            <h2 className="font-bold text-white tracking-wide text-sm">ECHO</h2>
            <div className="flex items-center gap-1.5">
                {isListening ? (
                    <span className="text-[9px] text-red-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Listening
                    </span>
                ) : isSpeaking ? (
                    <span className="text-[9px] text-blue-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        <Activity size={10} className="animate-pulse" /> Speaking
                    </span>
                ) : (
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Standby</span>
                )}
            </div>
          </div>
        </div>
        <button 
            onClick={() => {
                window.speechSynthesis.cancel();
                clearChat();
                setSessionActive(false); // Force restart overlay
            }} 
            className="p-2 text-gray-500 hover:text-white transition-colors"
        >
            <RotateCcw size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" ref={scrollRef}>
        {chatHistory.length === 0 && !sessionActive && (
             <div className="flex flex-col items-center justify-center h-full opacity-30">
                <Radio size={48} className="text-white mb-4" />
                <p className="text-white font-mono text-xs">Awaiting Link Initialization...</p>
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
                <div className={`max-w-[85%] rounded-2xl p-4 relative ${
                msg.role === 'user' 
                    ? 'bg-primary/90 text-white rounded-br-none shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                    : 'bg-white/5 backdrop-blur-md border border-white/10 text-gray-200 rounded-bl-none'
                }`}>
                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                
                {msg.role === 'model' && (
                    <button onClick={() => speak(msg.text)} className="absolute -right-8 top-2 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-primary transition-colors">
                        <Volume2 size={14} />
                    </button>
                )}

                {msg.correction && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <p className="text-xs text-red-400 line-through opacity-70">{msg.correction.original}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        <p className="text-sm text-green-400 font-bold">{msg.correction.corrected}</p>
                    </div>
                    </div>
                )}
                </div>
            </motion.div>
            ))}
        </AnimatePresence>
        
        {/* Processing / Listening Indicators */}
        <div className="h-10">
            {isProcessing && (
                <div className="flex items-center gap-2 text-primary ml-2">
                     <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></span>
                     <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></span>
                </div>
            )}
            {isListening && (
                <div className="flex items-center gap-2 ml-auto mr-2 justify-end">
                    <span className="text-[10px] text-gray-400 animate-pulse">{inputText || "Listening..."}</span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                </div>
            )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/80 backdrop-blur-xl border-t border-white/10 flex-shrink-0 pb-safe">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
             <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Listening..." : "Type transmission..."}
                className={`w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-full focus:outline-none focus:border-primary/50 transition-all placeholder-gray-600 text-sm ${isListening ? 'border-red-500/50 bg-red-500/5' : ''}`}
                disabled={isProcessing}
            />
          </div>
          
          <button
            onClick={() => sessionActive ? (isListening ? stopListening() : startListening()) : handleStartSession()}
            className={`p-3 rounded-full transition-all duration-300 ${
                isListening 
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' 
                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isListening ? <StopCircle size={18} /> : <Mic size={18} />}
          </button>
          
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-primary text-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;