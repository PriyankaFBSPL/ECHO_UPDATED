import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { translateText } from '../services/geminiService';
import { Mic, ArrowRight, Star, Copy, Check, Zap, StopCircle, Volume2, Loader } from 'lucide-react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const TranslatorScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ simple: string; enhanced: string; context: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const { addTranslation } = useStore();
  
  // Refs to handle state access inside callbacks without stale closures
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef(''); 

  // Load voices for TTS
  useEffect(() => {
    const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
        window.speechSynthesis.cancel();
    };
  }, []);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Target English
    
    // Attempt to use a good voice
    const preferredVoice = voices.find(v => 
        ['google us english', 'samantha', 'zira', 'daniel'].some(name => v.name.toLowerCase().includes(name))
    ) || voices[0];
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslate = async (textOverride?: string) => {
    const textToProcess = textOverride !== undefined ? textOverride : input;
    
    if (!textToProcess || !textToProcess.trim()) return;

    setLoading(true);
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const data = await translateText(textToProcess);
    setResult(data);
    setLoading(false);

    // Auto-speak the enhanced English version
    if (data.enhanced) {
        speak(data.enhanced);
    } else if (data.simple) {
        speak(data.simple);
    }

    addTranslation({
        id: Date.now().toString(),
        original: textToProcess,
        simple: data.simple,
        enhanced: data.enhanced,
        context: data.context,
        timestamp: Date.now(),
        isFavorite: false
    });
  };

  const toggleListening = () => {
    // If already listening, stop it manually. 
    // The 'onend' event will fire and trigger the translation.
    if (isListening) {
        if (recognitionRef.current) recognitionRef.current.stop();
        // We do NOT set isListening(false) here immediately, we let onend handle it
        return;
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (!Recognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    // --- 1. CLEAR PREVIOUS STATE ON NEW START ---
    setInput('');
    setResult(null);
    transcriptRef.current = '';
    window.speechSynthesis.cancel();

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    
    // Set language to Hindi as requested
    recognition.lang = 'hi-IN'; 
    recognition.interimResults = true; // Show results as we speak
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Update ref and state
      transcriptRef.current = transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // --- 2. AUTO TRANSLATE ON STOP ---
      // If we have captured text, execute translation immediately
      if (transcriptRef.current && transcriptRef.current.trim().length > 0) {
          handleTranslate(transcriptRef.current);
      }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error(e);
        setIsListening(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-indigo-400">
            <Zap size={20} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Neural Translator</h1>
      </div>
      
      {/* Input */}
      <div className="space-y-2">
        <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur opacity-30 transition duration-500 ${isListening ? 'opacity-100 animate-pulse' : 'group-hover:opacity-60'}`}></div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening for Hindi..." : "Tap Mic to speak Hindi..."}
                className={`relative w-full h-40 p-5 rounded-xl border bg-[#0a0a0a] text-white placeholder-gray-600 focus:outline-none resize-none shadow-inner transition-colors ${
                    isListening ? 'border-red-500/50' : 'border-white/10 focus:border-primary/50'
                }`}
            />
            
            <button 
                onClick={toggleListening}
                className={`absolute right-4 bottom-4 p-3 rounded-full transition-all duration-300 z-10 ${
                    isListening 
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' 
                    : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                }`}
            >
                {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
        </div>
        {isListening && (
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest animate-pulse ml-2">
                Listening (Hindi)...
            </p>
        )}
      </div>

      <button
        onClick={() => handleTranslate()}
        disabled={loading || !input.trim()}
        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
      >
        {loading ? (
             <span className="flex items-center gap-2">
                <Loader size={18} className="animate-spin" /> Processing...
             </span>
        ) : (
             <>Translate <ArrowRight size={18} /></>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in-up">
            {/* Simple */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Level 1: Basic</h3>
                    <div className="flex gap-2">
                        <button onClick={() => speak(result.simple)} className="text-gray-500 hover:text-white transition-colors">
                            <Volume2 size={16} />
                        </button>
                        <button onClick={() => handleCopy(result.simple)} className="text-gray-500 hover:text-white transition-colors">
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                <p className="text-lg text-gray-200 font-light">{result.simple}</p>
            </div>

            {/* Enhanced */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-6 border border-indigo-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-3 relative z-10">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Level 2: Enhanced</h3>
                    <div className="flex gap-2">
                        <button onClick={() => speak(result.enhanced)} className="text-indigo-300/50 hover:text-indigo-300 transition-colors">
                             <Volume2 size={16} />
                        </button>
                        <button onClick={() => handleCopy(result.enhanced)} className="text-indigo-300/50 hover:text-indigo-300 transition-colors">
                             {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                <p className="text-xl font-medium text-white mb-4 relative z-10">{result.enhanced}</p>
                
                <div className="pt-4 border-t border-indigo-500/20 relative z-10">
                    <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold mb-2">Contextual Application</p>
                    <p className="text-sm text-gray-400 italic leading-relaxed">"{result.context}"</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TranslatorScreen;