import React, { useState } from 'react';
import { useStore } from '../store';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Download, Share2, Award, TrendingUp, RefreshCw, Loader } from 'lucide-react';
import { jsPDF } from "jspdf";
import { evaluateProgress } from '../services/geminiService';
import { DetailedReport } from '../types';

const ProgressScreen: React.FC = () => {
  const { user, stats, vocabulary, chatHistory, latestReport, setLatestReport, updateStats } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Use latest report data if available, otherwise fallback to basic stats
  const displayStats = latestReport ? {
      grammar: latestReport.grammarScore,
      vocabulary: latestReport.vocabularyScore,
      fluency: latestReport.fluencyScore,
      pronunciation: latestReport.coherenceScore // Mapping Coherence to Pronunciation slot for chart consistency
  } : stats;

  const chartData = [
    { subject: 'Grammar', A: displayStats.grammar, fullMark: 100 },
    { subject: 'Vocab', A: displayStats.vocabulary, fullMark: 100 },
    { subject: 'Fluency', A: displayStats.fluency, fullMark: 100 },
    { subject: 'Coherence', A: displayStats.pronunciation, fullMark: 100 },
  ];

  const handleAnalyze = async () => {
    if (chatHistory.length < 5) {
        alert("Please chat more with ECHO before generating a report. We need at least 5 messages.");
        return;
    }

    setIsAnalyzing(true);
    try {
        const report = await evaluateProgress(chatHistory);
        setLatestReport(report);
        // Also update the simple stats in store
        updateStats({
            grammar: report.grammarScore,
            vocabulary: report.vocabularyScore,
            fluency: report.fluencyScore,
            pronunciation: report.coherenceScore
        });
    } catch (e) {
        alert("Failed to generate report. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const generatePDF = () => {
    if (!latestReport || !user) {
        alert("Please generate an analysis first.");
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // --- Header Background ---
    doc.setFillColor(59, 130, 246); // Primary Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    // --- Title ---
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("ECHO | PERFORMANCE REPORT", margin, 25);

    // --- User Info Box ---
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(margin, 50, pageWidth - (margin * 2), 35, 3, 3, 'FD');

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    // Left Column
    doc.text(`Student Name:`, margin + 10, 62);
    doc.setFont("helvetica", "bold");
    doc.text(user.name.toUpperCase(), margin + 45, 62);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Evaluation Date:`, margin + 10, 72);
    doc.setFont("helvetica", "bold");
    doc.text(new Date(latestReport.generatedAt).toLocaleDateString(), margin + 45, 72);

    // Right Column
    doc.setFont("helvetica", "normal");
    doc.text(`CEFR Level:`, pageWidth / 2 + 10, 62);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Blue
    doc.setFontSize(16);
    doc.text(latestReport.overallCEFR, pageWidth / 2 + 45, 62);
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Messages:`, pageWidth / 2 + 10, 72);
    doc.setFont("helvetica", "bold");
    doc.text(chatHistory.length.toString(), pageWidth / 2 + 45, 72);

    // --- Scores Section ---
    let yPos = 100;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SKILL ASSESSMENT", margin, yPos);
    
    // Draw simple bar charts for scores
    yPos += 10;
    const skills = [
        { label: "Grammar & Accuracy", score: latestReport.grammarScore },
        { label: "Vocabulary Range", score: latestReport.vocabularyScore },
        { label: "Fluency & Speed", score: latestReport.fluencyScore },
        { label: "Coherence & Logic", score: latestReport.coherenceScore }
    ];

    skills.forEach((skill, i) => {
        const barY = yPos + (i * 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(skill.label, margin, barY + 5);
        
        // Background Bar
        doc.setFillColor(230, 230, 230);
        doc.rect(margin + 40, barY, 100, 6, 'F');
        
        // Foreground Bar
        if (skill.score > 80) doc.setFillColor(34, 197, 94); // Green
        else if (skill.score > 60) doc.setFillColor(59, 130, 246); // Blue
        else doc.setFillColor(249, 115, 22); // Orange
        
        doc.rect(margin + 40, barY, skill.score, 6, 'F');
        
        // Score Text
        doc.text(`${skill.score}/100`, margin + 145, barY + 5);
    });

    // --- Qualitative Feedback ---
    yPos += 70;
    
    // Strengths
    doc.setFillColor(240, 253, 244); // Light Green
    doc.rect(margin, yPos, (pageWidth - margin * 3) / 2, 60, 'F');
    doc.setTextColor(22, 101, 52); // Dark Green
    doc.setFont("helvetica", "bold");
    doc.text("CORE STRENGTHS", margin + 5, yPos + 8);
    
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let strY = yPos + 18;
    latestReport.strengths.forEach(str => {
        const lines = doc.splitTextToSize(`• ${str}`, (pageWidth - margin * 4) / 2);
        doc.text(lines, margin + 5, strY);
        strY += (lines.length * 5) + 2;
    });

    // Improvements
    const rightColX = margin + ((pageWidth - margin * 3) / 2) + 10;
    doc.setFillColor(255, 247, 237); // Light Orange
    doc.rect(rightColX, yPos, (pageWidth - margin * 3) / 2, 60, 'F');
    doc.setTextColor(154, 52, 18); // Dark Orange
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("AREAS FOR IMPROVEMENT", rightColX + 5, yPos + 8);
    
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let impY = yPos + 18;
    latestReport.improvements.forEach(imp => {
        const lines = doc.splitTextToSize(`• ${imp}`, (pageWidth - margin * 4) / 2);
        doc.text(lines, rightColX + 5, impY);
        impY += (lines.length * 5) + 2;
    });

    // --- Action Plan ---
    yPos += 70;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("RECOMMENDED ACTION PLAN", margin, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const planLines = doc.splitTextToSize(latestReport.actionPlan, pageWidth - (margin * 2));
    doc.text(planLines, margin, yPos + 8);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by ECHO AI Tutor", margin, pageHeight - 10);

    doc.save(`${user.name.replace(/\s+/g, '_')}_ECHO_Report.pdf`);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-6 space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Award size={16} /> {latestReport ? latestReport.overallCEFR : user?.cefrLevel}
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-80 flex flex-col items-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl pointer-events-none"></div>
        <div className="flex items-center justify-between w-full mb-4">
             <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance Matrix</h3>
            </div>
            {latestReport && (
                <span className="text-[10px] text-gray-500">
                    Updated: {new Date(latestReport.generatedAt).toLocaleDateString()}
                </span>
            )}
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

      {/* Evaluation Action Area */}
      {!latestReport ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
               <h3 className="text-white font-bold mb-2">Detailed Evaluation Required</h3>
               <p className="text-gray-400 text-sm mb-4">Chat with ECHO to gather enough data, then generate a professional CEFR report.</p>
               <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
               >
                   {isAnalyzing ? <Loader className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                   {isAnalyzing ? "Analyzing Conversation..." : "Generate AI Report"}
               </button>
          </div>
      ) : (
          <div className="space-y-4">
              <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-4">
                  <h4 className="text-green-400 font-bold text-sm mb-2 flex items-center gap-2"><Award size={16}/> Top Strength</h4>
                  <p className="text-gray-300 text-sm">{latestReport.strengths[0]}</p>
              </div>
              <div className="bg-orange-900/10 border border-orange-500/20 rounded-2xl p-4">
                  <h4 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2"><TrendingUp size={16}/> Priority Improvement</h4>
                  <p className="text-gray-300 text-sm">{latestReport.improvements[0]}</p>
              </div>
          </div>
      )}

      {/* Stats List (Count-based) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Words</p>
            <p className="text-3xl font-bold text-white">{vocabulary.length}</p>
        </div>
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl"></div>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Mastered</p>
            <p className="text-3xl font-bold text-green-400">{vocabulary.filter(w => w.status === 'mastered').length}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button 
            onClick={generatePDF}
            disabled={!latestReport}
            className="flex-1 bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
        >
            <Download size={18} /> Download PDF
        </button>
        {latestReport && (
             <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-14 bg-white/5 text-gray-300 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
             >
                {isAnalyzing ? <Loader className="animate-spin" size={18} /> : <RefreshCw size={18} />}
             </button>
        )}
      </div>
    </div>
  );
};

export default ProgressScreen;