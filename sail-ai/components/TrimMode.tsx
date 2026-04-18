'use client';
import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Compass } from 'lucide-react';

// Minimal yelken ikonu
const SailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v20M12 2l8 6-8 6-8-6 8-6z" />
  </svg>
);

export default function TrimMode() {
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { analysisMode: 'trim' },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    'Performansımı analiz et',
    'Strateji önerileri al',
    'Riskleri değerlendir',
    'Fırsatları belirle',
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sol Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <SailIcon />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">Sail AI</h1>
              <p className="text-xs text-slate-500">Chart Course</p>
            </div>
          </div>
        </div>

        {/* Bilgi Kartı */}
        <div className="mt-auto p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
            <Compass size={20} className="mb-3 opacity-60" />
            <p className="text-sm font-medium mb-1">Rota Belirleme</p>
            <p className="text-xs opacity-70">Stratejik analiz modu aktif</p>
          </div>
        </div>
      </aside>

      {/* Ana Chat Alanı */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">TRIM Mod</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Beta</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistem Aktif
          </div>
        </header>

        {/* Mesajlar */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto text-center pt-20"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Compass size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">
                  Rotanızı Belirleyin
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Stratejik analiz için bir soru sorun. Sail AI size yol göstersin.
                </p>
                
                {/* Hızlı Promptlar */}
                <div className="flex flex-wrap justify-center gap-3">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleInputChange({ target: { value: prompt } } as any)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-5 py-4 rounded-2xl ${
                        m.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{m.content}</p>
                      <span className="text-[10px] opacity-50 mt-2 block">
                        {m.role === 'user' ? 'Siz' : 'Sail AI'}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl shadow-sm">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Alanı */}
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Dosya ekle"
                >
                  <Paperclip size={20} />
                </button>
                
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Stratejik analiz için bir soru sorun..."
                  className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                />
                
                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-2 transition-colors ${isRecording ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Sesli komut"
                >
                  <Mic size={20} />
                </button>
                
                <button
                  type="submit"
                  disabled={!input?.trim() || isLoading}
                  className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
            
            <p className="text-center text-xs text-slate-400 mt-3">
              Sail AI yapay zeka tarafından desteklenmektedir.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
