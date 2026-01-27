import React, { useState } from 'react';
import { useStore } from '../store';
import { translateText } from '../services/geminiService';
import { Mic, ArrowRight, Star, Copy, Check, Zap } from 'lucide-react';

const TranslatorScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ simple: string; enhanced: string; context: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { addTranslation } = useStore();
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const data = await translateText(input);
    setResult(data);
    setLoading(false);

    addTranslation({
        id: Date.now().toString(),
        original: input,
        simple: data.simple,
        enhanced: data.enhanced,
        context: data.context,
        timestamp: Date.now(),
        isFavorite: false
    });
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
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input source (Hindi/English)..."
                className="relative w-full h-40 p-5 rounded-xl border border-white/10 bg-[#0a0a0a] text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none resize-none shadow-inner"
            />
            <button className="absolute right-4 bottom-4 p-2 text-gray-500 hover:text-primary transition-colors bg-white/5 rounded-full hover:bg-white/10">
                <Mic size={18} />
            </button>
        </div>
      </div>

      <button
        onClick={handleTranslate}
        disabled={loading || !input.trim()}
        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? 'Processing...' : <>Translate <ArrowRight size={18} /></>}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in-up">
            {/* Simple */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Level 1: Basic</h3>
                    <button onClick={() => handleCopy(result.simple)} className="text-gray-500 hover:text-white transition-colors">
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>
                <p className="text-lg text-gray-200 font-light">{result.simple}</p>
            </div>

            {/* Enhanced */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-6 border border-indigo-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="flex justify-between items-start mb-3 relative z-10">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Level 2: Enhanced</h3>
                    <button onClick={() => handleCopy(result.enhanced)} className="text-indigo-300/50 hover:text-indigo-300 transition-colors">
                         {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
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