import React, { useState } from 'react';
import { useStore } from '../store';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATARS = ['👨‍💻', '👩‍🎨', '🦸‍♂️', '👩‍🚀', '🧘', '🕵️‍♀️'];

const LoginScreen: React.FC = () => {
  const login = useStore((state) => state.login);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name, selectedAvatar);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] pointer-events-none opacity-40"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl shadow-glass p-8">
            <div className="flex flex-col items-center mb-10">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary blur-xl opacity-50 rounded-full"></div>
                    <div className="relative p-4 bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20">
                        <Sparkles className="w-10 h-10 text-primary" />
                    </div>
                </div>
                
                <h1 className="text-4xl font-bold text-center mt-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight">ECHO</h1>
                <p className="text-center text-gray-400 mt-2 text-sm uppercase tracking-widest font-medium">AI English Tutor</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">Select Identity</label>
                <div className="flex justify-center gap-4">
                {AVATARS.map((avatar) => (
                    <button
                    key={avatar}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`text-2xl p-3 rounded-2xl transition-all duration-300 ${
                        selectedAvatar === avatar 
                        ? 'bg-primary/20 scale-110 border border-primary shadow-glow-sm' 
                        : 'bg-white/5 border border-white/5 hover:bg-white/10 grayscale opacity-50 hover:opacity-100 hover:grayscale-0'
                    }`}
                    >
                    {avatar}
                    </button>
                ))}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Username</label>
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="relative w-full bg-black/80 border border-white/10 text-white placeholder-gray-600 px-5 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                    required
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={!name.trim()}
                className="w-full group relative flex items-center justify-center space-x-2 bg-white text-black font-bold py-4 px-6 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
                <span className="relative z-10">Start Session</span>
                <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
