'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Compass, TrendingUp, BarChart3, AlertTriangle, Target, Database, Brain } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const SailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v20M12 2l8 6-8 6-8-6 8-6z" />
  </svg>
);

// M-1: Strict interface — no any types
interface ParsedAIResponse {
  text: string;
  metrics: Record<string, { label?: string; value: string; benchmark?: string; status?: 'good' | 'warning' | 'bad' }> | null;
  chart: { data: { label: string; value: number; color: string }[] } | null;
  recommendation: string | null;
  risk: string | null;
  error?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsed?: ParsedAIResponse;
}

function DataCard({ title, value, benchmark, status, sectorLabel }: { title: string; value: string; benchmark?: string; status?: 'good' | 'warning' | 'bad'; sectorLabel: string }) {
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
        <p className="text-xs mt-1 opacity-70">{sectorLabel.replace('{benchmark}', benchmark)}</p>
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

function parseAIResponse(content: string): ParsedAIResponse {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      text: (typeof parsed.chatMessage === 'string' ? parsed.chatMessage : null)
         ?? (typeof parsed.analysis     === 'string' ? parsed.analysis     : null)
         ?? content,
      metrics:        (parsed.metrics        as ParsedAIResponse['metrics'])        ?? null,
      chart:          (parsed.chart          as ParsedAIResponse['chart'])          ?? null,
      recommendation: (typeof parsed.recommendation === 'string' ? parsed.recommendation : null),
      risk:           (typeof parsed.risk           === 'string' ? parsed.risk           : null),
    };
  } catch (err: unknown) {
    console.error('[TrimMode] Failed to parse AI response:', err);
    return { text: content, metrics: null, chart: null, recommendation: null, risk: null };
  }
}

export default function TrimMode() {
  const { t, locale } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useDataMode, setUseDataMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // C-4: AbortController ref — cancelled on component unmount to prevent zombie requests
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // C-4: Cancel any in-flight request when the component unmounts
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, []);

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

    // C-4: Create fresh AbortController per request; abort previous if still in-flight
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          analysisMode: 'trim',
          language: locale,
          useData: useDataMode,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: JSON.stringify(data),
        parsed: parseAIResponse(JSON.stringify(data)),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      // Ignore AbortError — user navigated away or cancelled deliberately
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[TrimMode] fetch error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: JSON.stringify({
          chatMessage: t('trim.errorMessage'),
          error: true,
        }),
        parsed: { text: t('trim.errorMessage'), error: true, metrics: null, chart: null, recommendation: null, risk: null },
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    t('trim.benchmarkPrompt'),
    t('trim.performancePrompt'),
    t('trim.strategyPrompt'),
    t('trim.riskPrompt'),
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
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('trim.features')}</p>

          {/* Data Mode Toggle */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {useDataMode ? (
                  <Database size={16} className="text-blue-500" />
                ) : (
                  <Brain size={16} className="text-purple-500" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {useDataMode ? t('trim.dataModeLabel') : t('trim.independentModeLabel')}
                </span>
              </div>
              <button
                onClick={() => setUseDataMode(!useDataMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  useDataMode ? 'bg-blue-500' : 'bg-purple-500'
                }`}
              >
                <motion.div
                  animate={{ x: useDataMode ? 24 : 2 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {useDataMode ? t('trim.dataModeDesc') : t('trim.independentModeDesc')}
            </p>
          </div>

          {[
            { icon: TrendingUp, text: t('trim.sectorBenchmark'), color: 'text-blue-500' },
            { icon: BarChart3, text: t('trim.performanceAnalysis'), color: 'text-green-500' },
            { icon: Target, text: t('trim.strategyRecommendations'), color: 'text-purple-500' },
            { icon: AlertTriangle, text: t('trim.riskAssessment'), color: 'text-amber-500' },
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
            <p className="text-sm font-medium mb-1">{t('trim.navigationTitle')}</p>
            <p className="text-xs opacity-70">{t('trim.navigationDesc')}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">{t('trim.headerMode')}</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{t('trim.beta')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {t('trim.headerStatus')}
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
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">{t('trim.pageHeading')}</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  {t('trim.pageInstructions')}
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
                              <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{t('trim.analysisLabel')}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-700">{parsed?.text || t('trim.analysisLoading')}</p>
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
                                  sectorLabel={t('trim.sectorLabel')}
                                />
                              ))}
                            </div>
                          )}

                          {parsed?.chart && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={16} className="text-green-500" />
                                <span className="text-xs font-medium text-green-600 uppercase tracking-wider">{t('trim.performanceBenchmark')}</span>
                              </div>
                              <BarChart data={parsed.chart.data} />
                            </div>
                          )}

                          {parsed?.recommendation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <Target size={16} className="text-blue-600" />
                                <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{t('trim.recommendationLabel')}</span>
                              </div>
                              <p className="text-sm text-blue-800">{parsed.recommendation}</p>
                            </div>
                          )}

                          {parsed?.risk && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-amber-600" />
                                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">{t('trim.riskLabel')}</span>
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
                        <span className="text-sm text-slate-500">{t('trim.loadingAnalyzing')}</span>
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
                  title={t('trim.fileAdd')}
                >
                  <Paperclip size={20} />
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('trim.placeholder')}
                  className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-2 transition-colors ${isRecording ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
                  title={t('trim.voiceCommand')}
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
              {t('trim.footer')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
