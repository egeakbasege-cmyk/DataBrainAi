"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Milestone, X, Code2 } from "lucide-react";

export default function ExecutionPanel({ isOpen, setIsOpen, tasks }: any) {
  const [completed, setCompleted] = useState<string[]>([]);
  const toggle = (id: string) => setCompleted(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={() => setIsOpen(false)} 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]" 
          />
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0c0c0e] border-l border-white/10 z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h2 className="font-serif text-2xl flex items-center gap-3 text-white">
                <Milestone className="text-[#d4af37]" /> Execute.
              </h2>
              <X className="cursor-pointer text-white/40 hover:text-white transition-colors" onClick={() => setIsOpen(false)} />
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37] font-semibold">Active Roadmap</h3>
                {tasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => toggle(task.id)}>
                    <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${completed.includes(task.id) ? 'bg-[#d4af37] border-[#d4af37]' : 'border-white/20 group-hover:border-white/50'}`}>
                      {completed.includes(task.id) && <CheckCircle2 size={12} className="text-black" />}
                    </div>
                    <span className={`text-sm transition-all ${completed.includes(task.id) ? 'text-white/20 line-through' : 'text-white/70'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-white/5">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 flex items-center gap-2">
                  <Code2 size={14} /> Asset Vault
                </h3>
                <div className="bg-black/50 p-4 rounded font-mono text-[11px] text-[#d4af37]/80 border border-white/5">
                  {"{ \"status\": \"precision_grown\", \"deploy\": true }"}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
