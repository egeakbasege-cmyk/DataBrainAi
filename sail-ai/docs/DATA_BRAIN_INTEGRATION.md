# Data Brain™ Evolution Layer - Entegrasyon Kılavuzu

## Hızlı Başlangıç

### 1. Focus Dashboard'u Ekle

```tsx
// app/chat/page.tsx veya uygun yer
import { FocusDashboard } from '@/components/FocusDashboard'

export default function ChatPage() {
  return (
    <div className="flex">
      <div className="flex-1">
        {/* Mevcut chat arayüzü */}
      </div>
      <aside className="w-80">
        <FocusDashboard 
          onModeSelect={(mode) => setAgentMode(mode)}
        />
      </aside>
    </div>
  )
}
```

### 2. useDataBrain Hook'unu Kullan

```tsx
import { useDataBrain } from '@/hooks/useDataBrain'

function ChatComponent() {
  const { 
    trackAgentMode, 
    trackAnalysis,
    cognitiveLoad 
  } = useDataBrain()

  const handleModeChange = (mode: AgentMode) => {
    trackAgentMode(mode, 0.85)
    setAgentMode(mode)
  }

  const handleAnalysisComplete = (result: AnalysisResult) => {
    trackAnalysis(result.duration, result.confidenceIndex)
  }
}
```

### 3. Simülasyon Çalıştır

```tsx
import { useSimulation } from '@/lib/data-brain'

function ModeSelector() {
  const simulation = useSimulation()

  const compareModes = async () => {
    const comparison = await simulation.simulateModes(
      ['strategy', 'execution'],
      {
        context: 'B2B SaaS, 12% churn, £50k MRR',
        query: 'Reduce churn and increase expansion revenue',
        constraint: 'Limited to 2 engineers for 30 days'
      }
    )

    console.log(comparison.recommendation.reasoning)
    // "strategy mode offers the highest confidence (85%)..."
  }
}
```

## Mevcut Yapıya Entegrasyon

### AetherisStore'a Eklenmesi Gerekenler

```typescript
// lib/aetherisStore.ts

import { 
  initialDataBrainState, 
  DataBrainState,
  DataBrainActions 
} from './data-brain/store-extensions'

interface AetherisStore extends AetherisState, DataBrainState {
  // ...existing actions
  
  // Data Brain Actions
  queueAgentTask: DataBrainActions['queueAgentTask']
  runSimulation: DataBrainActions['runSimulation']
  updateFocusScore: DataBrainActions['updateFocusScore']
  setEventStreamEnabled: DataBrainActions['setEventStreamEnabled']
}

// Store oluştururken:
export const useAetherisStore = create<AetherisStore>()(
  subscribeWithSelector((set, get) => ({
    ...makeInitialState(),
    ...initialDataBrainState,
    
    // ...existing actions
    
    // Data Brain Actions implementation
    queueAgentTask: (mode, priority = 5) => {
      const task = createAgentTask(mode, priority)
      set((state) => ({
        agentQueue: [...state.agentQueue, task]
      }))
      return task.id
    },
    
    // ...etc
  }))
)
```

## Özellikler

### 1. EventStream Service
- **Hafif**: socket.io yerine EventSource + fetch
- **Batch**: Event'ler biriktirilip toplu gönderilir
- **Privacy-friendly**: Session-scoped, kalıcı depolama yok

### 2. Simulation Engine
- **Hızlı**: <500ms, cache'lenmiş capability'ler
- **Bilgilendirici**: Mod karşılaştırması + öneri
- **Offline-ready**: AI çağrısı gerektirmez

### 3. Focus Dashboard
- **Gerçek zamanlı**: Cognitive load, strategic vectors
- **Etkileşimli**: Mod seçimi, simülasyon başlatma
- **Aetheris temalı**: Mevcut UI ile uyumlu

## Çıkartılan Bileşenler (Neden?)

| Bileşen | Neden Çıkartıldı | Alternatif |
|---------|------------------|------------|
| Unified Identity Graph | Zaten userStore var | Mevcut store'u kullan |
| Consent Module | NextAuth yeterli | Middleware + auth.ts |
| socket.io | Aşırı karmaşık | EventSource + fetch |
| Docker Sandbox | MVP için aşırı | Future consideration |

## Gelecek Geliştirmeler

1. **Predictive Focus Score**: ML-based öneriler
2. **Agent Sandbox**: İzole test ortamı
3. **Scheduled Intelligence**: Zamanlanmış analizler
4. **Real-time Collaboration**: Çok kullanıcılı modlar

## Troubleshooting

### Event'ler gitmiyor
```typescript
// Debug için:
const stream = useEventStream()
console.log(stream.getBufferSize()) // Buffer'daki event sayısı
stream.flush() // Manuel flush
```

### Simülasyon çalışmıyor
```typescript
// Mock data kullan:
const simulation = useSimulation()
const result = simulation.quickSimulate('strategy', 'test query')
```
