import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Zap, BookOpen, Trophy, Sun, Moon, ArrowRight, Activity } from 'lucide-react';
import { generateDailyVocab } from '../services/geminiService';
import { MessageCircle, Globe } from 'lucide-react';

const DashboardScreen: React.FC = () => {
  const { user, isDarkMode, toggleDarkMode, setScreen, vocabulary, addVocab } = useStore();
  
  useEffect(() => {
    if (vocabulary.length === 0 && user) {
        generateDailyVocab(user.cefrLevel).then(words => {
            if(words.length > 0) addVocab(words);
        });
    }
  }, [vocabulary.length, user]);

  const StatCard = ({ icon: Icon, label, value, colorClass }: any) => (
    <div className="bg-glass backdrop-blur-md p-4 rounded-2xl border border-glass-border flex flex-col justify-between h-28 relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${colorClass} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity`}></div>
      <div className="flex justify-between items-start z-10">
        <div className={`p-2 rounded-lg bg-white/5`}>
            <Icon size={18} className="text-gray-300" />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider z-10">{label}</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-6 space-y-8 pb-32">
      {/* Cinematic Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm text-gray-400 font-medium mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            System Online
          </p>
          <h1 className="text-3xl font-bold text-white leading-tight">
            Welcome back, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-300">{user?.name}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                {isDarkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-gray-400" />}
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black rounded-full border border-white/10 flex items-center justify-center text-2xl shadow-lg relative">
                {user?.avatar}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
            </div>
        </div>
      </div>

      {/* Stats Grid - Glassmorphism */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Zap} label="Streak" value={user?.streak} colorClass="from-orange-500 to-red-500" />
        <StatCard icon={Trophy} label="Level" value={user?.cefrLevel} colorClass="from-purple-500 to-pink-500" />
        <StatCard icon={BookOpen} label="Vocab" value={vocabulary.filter(w => w.status === 'mastered').length} colorClass="from-green-500 to-teal-500" />
      </div>

      {/* Hero Card - Daily Vocab */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 group cursor-pointer shadow-glow-sm" onClick={() => setScreen('vocabulary')}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-black/80 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 z-0"></div>
        
        <div className="relative z-10 p-6 flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-widest rounded-full">Daily Intel</span>
                <Activity size={20} className="text-blue-400 opacity-80" />
            </div>
            
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Vocabulary Update</h2>
                <p className="text-gray-400 text-sm mb-4">3 new data points available for acquisition.</p>
                
                <div className="flex items-center text-blue-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                    Initialize Learning <ArrowRight size={16} className="ml-2" />
                </div>
            </div>
        </div>
      </div>

      {/* Quick Actions List */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Modules</h3>
        
        <button 
          onClick={() => setScreen('practice')}
          className="w-full bg-glass backdrop-blur-sm p-5 rounded-2xl border border-glass-border flex items-center justify-between hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
              <MessageCircle size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-200">Conversation Protocol</p>
              <p className="text-xs text-gray-500 mt-0.5">Interact with ECHO AI</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
            <ArrowRight size={16} className="text-gray-400" />
          </div>
        </button>

        <button 
            onClick={() => setScreen('translator')}
            className="w-full bg-glass backdrop-blur-sm p-5 rounded-2xl border border-glass-border flex items-center justify-between hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <Globe size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-200">Translation Matrix</p>
              <p className="text-xs text-gray-500 mt-0.5">Hindi-English Interface</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
            <ArrowRight size={16} className="text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default DashboardScreen;