'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Text } from '@react-three/drei';
import { useRef, useState, useMemo, Suspense } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';

// Loading component for 3D scene
function SceneLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020202]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-400 text-sm font-mono tracking-widest">ZAMAN TÜNELİ YÜKLENİYOR...</p>
      </div>
    </div>
  );
}

// Optimized 3D Data Particles
function DataStream() {
  const points = useMemo(() => {
    // Reduced from 50 to 20 for better performance
    return Array.from({ length: 20 }).map(() => ({
      pos: [Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 10 - 20],
      size: Math.random() * 0.05 + 0.02
    }));
  }, []);

  return (
    <>
      {points.map((p, i) => (
        <Float 
          speed={1.5} 
          rotationIntensity={0.5} 
          floatIntensity={1} 
          key={i}
        >
          <mesh position={p.pos as any}>
            <sphereGeometry args={[p.size, 8, 8]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

// Optimized 3D Scene
function TimeTravelScene({ timeState }: { timeState: string }) {
  return (
    <>
      <color attach="background" args={['#020202']} />
      <ambientLight intensity={0.3} />
      <Stars 
        radius={80} 
        depth={30} 
        count={2000} 
        factor={3} 
        saturation={0} 
        fade 
        speed={0.5} 
      />
      <DataStream />
      
      <Float speed={1} rotationIntensity={0.3} floatIntensity={0.3}>
        <Text
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {timeState === 'FUTURE' ? 'TIMELINE: 2045' : timeState === 'PAST' ? 'TIMELINE: 2020' : 'SAIL AI CORE'}
        </Text>
      </Float>
      
      <OrbitControls 
        enableZoom={false} 
        autoRotate 
        autoRotateSpeed={0.3}
        enablePan={false}
      />
    </>
  );
}

// SVG Icon Components
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9"></polygon>
  </svg>
);

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19v3"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <rect x="9" y="2" width="6" height="13" rx="3"></rect>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <path d="m12 19-7-7 7-7"></path>
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  </svg>
);

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
    <path d="M10 9H8"></path>
    <path d="M16 13H8"></path>
    <path d="M16 17H8"></path>
  </svg>
);

export default function SailAITimeTravel() {
  const [timeState, setTimeState] = useState('PRESENT');
  const [isRecording, setIsRecording] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading } = useChat({
    api: '/api/chat',
    body: {
      analysisMode: 'trim',
    },
  });

  // Delay scene rendering for better UX
  useState(() => {
    const timer = setTimeout(() => setIsSceneReady(true), 100);
    return () => clearTimeout(timer);
  });

  const quickCommands = [
    { label: 'Gelecegi Analiz Et', icon: ArrowRightIcon, action: () => setInput('Gelecekteki pazar trendlerini analiz et') },
    { label: 'Gecmis Veriler', icon: ArrowLeftIcon, action: () => setInput('Gecmis performans verilerini goster') },
    { label: 'Strateji Olustur', icon: SparklesIcon, action: () => setInput('Yeni bir yatirim stratejisi oner') },
    { label: 'Rapor Indir', icon: FileTextIcon, action: () => setInput('Detayli rapor olustur ve indir') },
  ];

  const timeStates = [
    { key: 'PAST', label: 'GECMIS', color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50' },
    { key: 'PRESENT', label: 'SIMDI', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50' },
    { key: 'FUTURE', label: 'GELECEK', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' },
  ];

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.csv,.xlsx,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setInput(`Dosya yuklendi: ${file.name} - Icerigini analiz et`);
      }
    };
    input.click();
  };

  return (
    <div className="relative h-screen w-screen bg-[#020202] overflow-hidden">
      {/* 3D Render Layer with Suspense */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<SceneLoader />}>
          <Canvas 
            camera={{ position: [0, 0, 5], fov: 75 }}
            dpr={[1, 1.5]} // Optimize for performance
            gl={{ antialias: false, alpha: false }}
            onCreated={() => setIsSceneReady(true)}
          >
            <TimeTravelScene timeState={timeState} />
          </Canvas>
        </Suspense>
      </div>

      {/* Downwind UI: Glassmorphism Overlay */}
      <div className="relative z-10 flex h-full pointer-events-none">
        {/* Sol Panel: Data Sources & Graphs */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-1/4 p-8 flex flex-col justify-between pointer-events-auto bg-black/20 backdrop-blur-md border-r border-white/5"
        >
          <div>
            <h2 className="text-[10px] tracking-[0.4em] text-blue-500 font-bold uppercase mb-4">Data Sources</h2>
            <div className="space-y-4">
              {['Blockchain Ledger', 'Neural Market Feed', 'Historical ROI'].map(source => (
                <div key={source} className="group flex items-center justify-between p-3 border border-white/10 rounded-lg hover:bg-white/5 transition-all">
                  <span className="text-xs text-zinc-400 group-hover:text-white">{source}</span>
                  <div className="w-1 h-1 bg-green-500 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-40 bg-zinc-900/40 rounded-xl border border-white/5 p-4">
            <p className="text-[10px] text-zinc-600 uppercase mb-2 font-mono">Simulated Growth</p>
            <div className="w-full h-full flex items-end gap-1">
              {[40, 70, 45, 90, 65, 80].map((h, i) => (
                <motion.div 
                  key={i} 
                  initial={{ height: 0 }} 
                  animate={{ height: `${h}%` }} 
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex-1 bg-blue-500/30 rounded-t-sm" 
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Orta: Deneyim Alani */}
        <div className="flex-1" />

        {/* Sag Panel: Sinematik Chat */}
        <motion.aside 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-1/3 p-8 flex flex-col pointer-events-auto bg-gradient-to-l from-black via-black/80 to-transparent"
        >
          <div className="flex-1 overflow-y-auto space-y-6 pr-4 scrollbar-hide">
            {messages.map((m) => (
              <div key={m.id} className={`${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <p className="text-[10px] text-zinc-500 font-mono mb-1 uppercase tracking-widest">
                  {m.role === 'user' ? 'Architect' : 'Verdante'}
                </p>
                <div className={`inline-block max-w-full p-4 rounded-lg leading-relaxed ${
                  m.role === 'user' ? 'bg-white/5 text-white' : 'text-blue-200 bg-blue-500/5 border-l border-blue-500'
                }`}>
                  <span className="text-sm font-light leading-relaxed tracking-wide">
                    {m.content}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Downwind - Gelismis Input Alani */}
          <div className="mt-8 space-y-4">
            {/* Zaman Durumu Kontrolleri */}
            <div className="flex items-center justify-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
              <div className="text-zinc-500 mr-2"><ClockIcon /></div>
              {timeStates.map((state) => (
                <button
                  key={state.key}
                  onClick={() => setTimeState(state.key)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest transition-all ${
                    timeState === state.key
                      ? `${state.bgColor} ${state.color} ${state.borderColor} border`
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {state.label}
                </button>
              ))}
            </div>

            {/* Hizli Komut Butonlari */}
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((cmd, idx) => (
                <motion.button
                  key={cmd.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  onClick={cmd.action}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-[10px] text-zinc-400 hover:text-white transition-all"
                >
                  <cmd.icon />
                  {cmd.label}
                </motion.button>
              ))}
            </div>

            {/* Ana Input Form */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 p-2 bg-zinc-950/80 border border-zinc-800 rounded-2xl focus-within:border-blue-500/50 transition-all">
                {/* Dosya Yukleme Butonu */}
                <button
                  type="button"
                  onClick={handleFileUpload}
                  className="p-2.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  title="Dosya Yukle"
                >
                  <PaperclipIcon />
                </button>

                {/* Input Alani */}
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Zaman tunelinde bir komut ver..."
                  className="flex-1 bg-transparent p-2 text-white text-sm font-light focus:outline-none placeholder:text-zinc-600"
                />

                {/* Sesli Giris Butonu */}
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-2.5 rounded-xl transition-all ${
                    isRecording
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                  title="Sesli Komut"
                >
                  <div className={isRecording ? 'animate-bounce' : ''}>
                    <MicIcon />
                  </div>
                </button>

                {/* Gonder Butonu */}
                <button
                  type="submit"
                  disabled={!input?.trim() || isLoading}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all"
                  title="Gonder"
                >
                  <SendIcon />
                </button>
              </div>

              {/* Alt Bilgi */}
              <div className="flex items-center justify-between mt-2 px-2">
                <span className="text-[9px] text-zinc-600 font-mono tracking-wider">
                  SAIL AI v2.4 • {timeState}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-600 font-mono">
                    LNTR-04
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                </div>
              </div>
            </form>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
