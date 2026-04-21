"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Anchor, ArrowRight, BarChart3, Database, Mic, Mail, 
  History, FileText, Compass, Wind, Navigation, ShieldCheck 
} from 'lucide-react';
import ExecutionPanel from '@/components/ExecutionPanel';

export default function LandingPage() {
  const [panelOpen, setPanelOpen] = useState(false);
  const demoTasks = [
    {id: "1", title: "Market Gap Analysis (E-Commerce)", completed: false},
    {id: "2", title: "Benchmark Setup (McKinsey Data)", completed: false},
    {id: "3", title: "Sovereign Mode Deployment", completed: false}
  ];

  return (
    <main className="relative min-h-screen bg-[#09090b] text-white font-sans overflow-x-hidden">
      <ExecutionPanel isOpen={panelOpen} setIsOpen={setPanelOpen} tasks={demoTasks} />
      
      {/* BACKGROUND & VINTAGE OVERLAYS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Dosya ismini sail-vertical.jpg olarak güncelledik */}
        <div 
          className="absolute inset-0 bg-[url('/sail-vertical.jpg')] bg-cover bg-center opacity-25 scale-100 transition-opacity duration-700" 
          style={{ mixBlendMode: 'luminosity' }}
        />
        <div className="maritime-vintage-filter opacity-40" />
        <div className="noise-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/60 via-[#09090b]/80 to-[#09090b]" />
      </div>

      {/* HEADER */}
      <header className="relative z-50 flex items-center justify-between px-6 py-8 md:px-12 border-b border-white/5 glass-panel">
        <div className="flex items-center gap-3">
          <Anchor className="text-[#d4af37]" size={28} />
          <span className="font-serif text-2xl tracking-tighter font-bold uppercase">SAIL AI<span className="text-[#d4af37]">+</span></span>
        </div>
        <div className="flex items-center gap-6">
          <button className="hidden md:block text-[10px] tracking-widest uppercase text-white/60 hover:text-white">Pricing</button>
          <button onClick={() => setPanelOpen(true)} className="text-[10px] tracking-[0.3em] uppercase px-6 py-3 border border-[#d4af37]/30 text-[#d4af37] rounded hover:bg-[#d4af37] hover:text-black transition-all font-bold">
            Execute Mode
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-20 pt-32 pb-24 px-6 max-w-7xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block mb-8 px-5 py-2 glass-panel rounded-full border border-[#d4af37]/20 text-[10px] uppercase tracking-[0.4em] text-[#d4af37]">
          AI Business Advisory · Est. 2024
        </motion.div>
        <h1 className="font-serif text-6xl md:text-9xl mb-8 tracking-tight leading-[0.85] font-medium">
          Strategy <br /> grounded in <br /> <span className="text-gold-gradient italic">evidence.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 mb-12 font-light max-w-2xl mx-auto leading-relaxed italic">
          Sail AI delivers benchmarked business strategy for independent operators. Each analysis draws on verified industry data.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button className="group relative px-12 py-5 bg-[#18181b] border border-[#d4af37]/50 rounded text-white font-bold tracking-[0.2em] uppercase text-xs flex items-center gap-3 overflow-hidden transition-all hover:shadow-[0_0_50px_rgba(212,175,55,0.2)]">
            <span>Begin Analysis</span>
            <ArrowRight size={16} className="text-[#d4af37] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* INDICATIVE OUTPUTS (Ekran görüntündeki veri blokları) */}
      <section className="relative z-20 py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid md:grid-cols-4 gap-0 divide-x divide-white/5 border border-white/5 bg-black/20">
          {[
            { label: "Time to Analysis", val: "< 60s", desc: "From input to full plan" },
            { label: "Benchmark-Referenced", val: "100%", desc: "Every data point sourced" },
            { label: "Analyses Included", val: "5 free", desc: "No credit card required" },
            { label: "Transparent Pricing", val: "3 tiers", desc: "From $0 to bespoke advisory" }
          ].map((item, i) => (
            <div key={i} className="p-10 hover:bg-white/5 transition-colors">
              <div className="text-3xl text-gold-gradient font-serif mb-4">{item.val}</div>
              <div className="text-[10px] uppercase tracking-widest text-white mb-2 font-bold">{item.label}</div>
              <div className="text-xs text-white/30 font-light leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER - PRECISE EXECUTION */}
      <footer className="relative z-20 py-32 border-t border-white/5 text-center">
        <div className="mt-12 text-[9px] uppercase tracking-[0.6em] text-white/20">
          © 2026 Sail AI · Absolute Execution · Precision Grown
        </div>
      </footer>
    </main>
  );
}
