import React from 'react';
import { useStore } from '../store';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Download, Share2, Award, TrendingUp } from 'lucide-react';
import { jsPDF } from "jspdf";

const ProgressScreen: React.FC = () => {
  const { user, stats, vocabulary } = useStore();

  const chartData = [
    { subject: 'Grammar', A: stats.grammar, fullMark: 100 },
    { subject: 'Vocab', A: stats.vocabulary, fullMark: 100 },
    { subject: 'Fluency', A: stats.fluency, fullMark: 100 },
    { subject: 'Pronun.', A: stats.pronunciation, fullMark: 100 },
  ];

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("ECHO Learning Report", 20, 20);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Student: ${user?.name}`, 20, 40);
    doc.text(`CEFR Level: ${user?.cefrLevel}`, 20, 50);
    doc.save(`${user?.name}_ECHO_Report.pdf`);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-6 space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Award size={16} /> {user?.cefrLevel}
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-80 flex flex-col items-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl pointer-events-none"></div>
        <div className="flex items-center gap-2 mb-4 self-start">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance Matrix</h3>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#333" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Student"
              dataKey="A"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="#3B82F6"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats List */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Acquisition</p>
            <p className="text-3xl font-bold text-white">{vocabulary.length}</p>
        </div>
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl"></div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Mastery Count</p>
            <p className="text-3xl font-bold text-green-400">{vocabulary.filter(w => w.status === 'mastered').length}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button 
            onClick={generatePDF}
            className="flex-1 bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        >
            <Download size={18} /> Export Data
        </button>
        <button 
            className="flex-1 bg-white/5 text-gray-300 border border-white/10 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
        >
            <Share2 size={18} /> Share
        </button>
      </div>
    </div>
  );
};

export default ProgressScreen;