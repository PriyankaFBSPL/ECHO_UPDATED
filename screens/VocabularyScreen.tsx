import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Volume2, CheckCircle, XCircle, RefreshCw, Layers, Loader, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VocabularyScreen: React.FC = () => {
  const { vocabulary, updateVocabStatus, isVocabLoading, setScreen } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices reliably (same as ChatScreen)
  useEffect(() => {
    const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const practiceWords = vocabulary.filter(w => w.status !== 'mastered');
  const currentWord = practiceWords[currentIndex];

  const handleNext = (status: 'mastered' | 'reviewing') => {
    if (currentWord) {
      updateVocabStatus(currentWord.id, status);
      setFlipped(false);
      // Logic to move to next or wrap around
      if (currentIndex >= practiceWords.length - 1) {
        setCurrentIndex(0);
      } else {
        // Keep index, array will shrink if mastered, or if reviewing it stays in pool
        // But if we marked as 'mastered', the array practiceWords shrinks immediately.
        // If we marked as 'reviewing', it stays.
        if (status === 'reviewing') {
            setCurrentIndex(prev => (prev + 1) % practiceWords.length);
        } else {
             // If array shrinks, currentIndex might be out of bounds, so clamp it
             setCurrentIndex(prev => Math.min(prev, practiceWords.length - 2)); 
        }
      }
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // Attempt to use a good voice
    const preferredVoice = voices.find(v => 
        ['google us english', 'samantha', 'zira'].some(name => v.name.toLowerCase().includes(name))
    ) || voices[0];
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // Loading State - Buffering Screen
  if (isVocabLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-primary/30 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader size={30} className="text-primary animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Acquiring Target Data</h2>
              <p className="text-gray-500 text-sm font-mono animate-pulse">Decrypting linguistic patterns...</p>
          </div>
      );
  }

  // Empty State - All Done
  if (practiceWords.length === 0 && !isVocabLoading && vocabulary.length > 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-24 h-24 bg-green-500/10 rounded-full border border-green-500/30 flex items-center justify-center mb-6 shadow-glow">
                <CheckCircle className="text-green-500 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">All Targets Acquired</h2>
            <p className="text-gray-500 max-w-xs mb-8">You have mastered the current vocabulary dataset.</p>
            <button 
                onClick={() => setScreen('dashboard')} 
                className="px-6 py-3 bg-white/10 border border-white/20 rounded-full text-white text-sm font-bold hover:bg-white/20"
            >
                Return to Base
            </button>
        </div>
    );
  }
  
  // Empty State - No Data (Edge case)
  if (practiceWords.length === 0 && !isVocabLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <p className="text-gray-500 mb-4">No data available.</p>
            <button onClick={() => setScreen('dashboard')} className="text-primary underline">Return to Dashboard</button>
        </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-6 flex flex-col items-center pb-32">
       {/* Header with Back Button */}
       <div className="w-full flex justify-between items-center mb-6 z-10">
          <button onClick={() => setScreen('dashboard')} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="text-gray-500 text-xs font-mono uppercase tracking-widest">
            Unit {currentIndex + 1} / {practiceWords.length}
          </div>
          <button onClick={() => setFlipped(!flipped)} className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <Layers size={14} /> Flip
          </button>
      </div>

      <div className="relative w-full max-w-md perspective-1000 flex-grow flex flex-col justify-center min-h-[50vh]">
        <AnimatePresence mode='wait'>
            <motion.div
                key={currentWord.id + flipped}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 100 }}
                className="w-full h-full cursor-pointer relative"
                onClick={() => setFlipped(!flipped)}
            >
                {!flipped ? (
                    // Front
                    <div className="w-full min-h-[400px] h-full bg-[#121212] rounded-[32px] border border-white/10 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group shadow-lg">
                         <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                         
                         <span className="px-4 py-1.5 bg-blue-900/20 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-widest mb-8">
                             {currentWord.partOfSpeech}
                         </span>
                         
                         <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight break-words max-w-full">{currentWord.word}</h2>
                         <p className="text-gray-500 font-mono mb-10 text-lg">/{currentWord.pronunciation}/</p>
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }}
                            className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all active:scale-95 z-20"
                         >
                             <Volume2 size={24} />
                         </button>
                    </div>
                ) : (
                    // Back
                    <div className="w-full min-h-[400px] h-full bg-[#121212] rounded-[32px] border border-white/10 flex flex-col p-8 text-left relative shadow-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600 rounded-t-[32px]"></div>
                        
                        <div className="flex-grow overflow-y-auto no-scrollbar">
                            <h3 className="text-2xl font-bold text-white mb-1">{currentWord.word}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-6">Definition</p>
                            
                            <p className="text-gray-300 mb-6 text-lg leading-relaxed font-light">
                                {currentWord.definition}
                            </p>
                            
                            <div className="space-y-4">
                                <div className="pl-4 border-l-2 border-white/20">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Usage</p>
                                    <p className="text-sm text-gray-400 italic">"{currentWord.example}"</p>
                                </div>
                                <div className="pl-4 border-l-2 border-orange-500/50">
                                    <p className="text-[10px] text-orange-400 uppercase font-bold mb-1">Local Context</p>
                                    <p className="text-sm text-gray-300 italic">"{currentWord.indianContextExample}"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-4 mt-8 w-full max-w-md">
        <button 
            onClick={() => handleNext('reviewing')}
            className="flex-1 py-4 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-2"
        >
            <RefreshCw size={16} /> Review
        </button>
        <button 
            onClick={() => handleNext('mastered')}
            className="flex-1 py-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2 shadow-glow-sm"
        >
            <CheckCircle size={16} /> Master
        </button>
      </div>
    </div>
  );
};

export default VocabularyScreen;