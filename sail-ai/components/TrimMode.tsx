'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Compass, TrendingUp, BarChart3, AlertTriangle, Target } from 'lucide-react';

const SailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v20M12 2l8 6-8 6-8-6 8-6z" />
  </svg>
);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsed?: any;
}

function DataCard({ title, value, benchmark, status }: { title: string; value: string; benchmark?: string; status?: 'good' | 'warning' | 'bad' }) {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    bad: 'bg-red-50 border-red-200 text-red-700',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${status ? statusColors[status] : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
      {benchmark && (
        <p className="text-xs mt-1 opacity-70">Sektör: {benchmark}</p>
      )}
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-24">{item.label}</span>
          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
            />
          </div>
          <span className="text-xs font-medium w-12 text-right">%{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function parseAIResponse(content: string) {
  try {
    const parsed = JSON.parse(content);
    return {
      text: parsed.chatMessage || parsed.analysis || content,
      metrics: parsed.metrics || null,
      chart: parsed.chart || null,
      recommendation: parsed.recommendation || null,
      risk: parsed.risk || null,
    };
  } catch {
    return { text: content, metrics: null, chart: null, recommendation: null, risk: null };
  }
}

export default function TrimMode() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          analysisMode: 'trim',
          language: 'tr',
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: JSON.stringify(data),
        parsed: parseAIResponse(JSON.stringify(data)),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: JSON.stringify({
          chatMessage: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
          error: true,
        }),
        parsed: { text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', error: true },
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Sektör kıyaslamamı göster',
    'Performans metriklerimi analiz et',
    'Strateji önerileri al',
    'Riskleri değerlendir',
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
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

        <div className="p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Özellikler</p>
          
          {[
            { icon: TrendingUp, text: 'Sektör Kıyaslama', color: 'text-blue-500' },
            { icon: BarChart3, text: 'Performans Analizi', color: 'text-green-500' },
            { icon: Target, text: 'Strateji Önerileri', color: 'text-purple-500' },
            { icon: AlertTriangle, text: 'Risk Değerlendirme', color: 'text-amber-500' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
              <item.icon size={16} className={item.color} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
            <Compass size={20} className="mb-3 opacity-60" />
            <p className="text-sm font-medium mb-1">Rota Belirleme</p>
            <p className="text-xs opacity-70">Veri destekli stratejik analiz</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">TRIM Mod</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Beta</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Veri Destekli Analiz
          </div>
        </header>

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
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">Veri Destekli Analiz</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Sektör kıyaslamaları ve performans metrikleriyle desteklenmiş stratejik analiz için soru sorun.
                </p>
                
                <div className="flex flex-wrap justify-center gap-3">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((m, i) => {
                  const parsed = m.role === 'assistant' ? m.parsed : null;
                  
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'user' ? (
                        <div className="max-w-[80%] px-5 py-4 rounded-2xl bg-slate-900 text-white">
                          <p className="text-sm leading-relaxed">{m.content}</p>
                        </div>
                      ) : parsed?.error ? (
                        <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-5">
                          <p className="text-sm text-red-700">{parsed.text}</p>
                        </div>
                      ) : (
                        <div className="w-full space-y-4">
                          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <BarChart3 size={16} className="text-blue-500" />
                              <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Analiz</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-700">{parsed?.text || 'Analiz yükleniyor...'}</p>
                          </div>
                          
                          {parsed?.metrics && (
                            <div className="grid grid-cols-3 gap-3">
                              {Object.entries(parsed.metrics).map(([key, data]: [string, any], idx) => (
                                <DataCard
                                  key={idx}
                                  title={data.label || key}
                                  value={data.value}
                                  benchmark={data.benchmark}
                                  status={data.status}
                                />
                              ))}
                            </div>
                          )}
                          
                          {parsed?.chart && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={16} className="text-green-500" />
                                <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Performans Kıyaslama</span>
                              </div>
                              <BarChart data={parsed.chart.data} />
                            </div>
                          )}
                          
                          {parsed?.recommendation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <Target size={16} className="text-blue-600" />
                                <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Öneri</span>
                              </div>
                              <p className="text-sm text-blue-800">{parsed.recommendation}</p>
                            </div>
                          )}
                          
                          {parsed?.risk && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-amber-600" />
                                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Risk</span>
                              </div>
                              <p className="text-sm text-amber-800">{parsed.risk}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-slate-500">Veriler analiz ediliyor...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto">
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
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Veri destekli analiz için soru sorun..."
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
              Sail AI veri destekli stratejik analiz sunar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
