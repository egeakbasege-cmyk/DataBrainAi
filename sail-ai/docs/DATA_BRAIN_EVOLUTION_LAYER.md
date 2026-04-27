# Data Brain™ Evolution Layer - Tasarım Dokümanı

## 1. Felsefe: Mevcut Yapıyı Genişletmek

Sail AI'nın zaten güçlü bir temeli var:
- **AetherisStore**: Zustand-based state management
- **AgentMode**: 5 farklı ajans modu
- **AnalysisMode**: upwind/downwind/sail/trim/catamaran
- **StrategicVector**: Stratejik vektör takibi
- **PredictiveAlert**: Öngörüsel sapma uyarıları

**Yeni katman bu yapıyı değiştirmeden genişletir.**

## 2. Bileşenler

### 2.1 EventStream Service (CloudStream yerine)
**Neden CloudStream değil?**
- socket.io ağır bir bağımlılık
- <100ms iddiası zorlu altyapı gerektirir
- Sail AI'nın şu anki kullanım pattern'ine göre aşırı

**Yerine: Lightweight EventStream**
- EventSource (Server-Sent Events) + fetch fallback
- Sadece gerekli event'leri track et
- Batch processing ile verimli

```typescript
// Kullanım
const stream = EventStreamService.getInstance();
stream.track('agent_selection', { mode: 'strategy', confidence: 0.85 });
stream.track('analysis_complete', { mode: 'catamaran', duration: 3200 });
```

### 2.2 Simulation Engine (Mirofish'den esinlenme)
**Fayda**: Kullanıcı farklı modları seçmeden önce sonuçlarını simüle edebilir

**Akış**:
1. **Seed**: Kullanıcı context'i + seçilen modlar
2. **Simulate**: Her mod için hafifletilmiş AI çağrısı (cached/simulated)
3. **Report**: Karşılaştırmalı sonuçlar

**Örnek**:
```
Kullanıcı: "Conversion rate'imi artırmak istiyorum"
Modlar: ["strategy", "execution"]

Simulation:
- Strategy Mode: Long-term positioning, 60-90 day horizon
- Execution Mode: Immediate action items, 30-day sprint

Report: "Execution mode daha hızlı sonuç verir (30 gün), 
        Strategy mode daha sürdürülebilir (90 gün)"
```

### 2.3 Enhanced Agent Orchestrator
Mevcut `orchestrateModes` yerine **AetherisStore'a entegre** versiyon:

```typescript
// Mevcut store'a eklenir
interface AetherisStore {
  // ...existing
  
  // Yeni
  activeAgents: AgentInstance[];
  agentQueue: AgentTask[];
  simulationResults: SimulationResult[];
  
  // Actions
  queueAgentTask: (task: AgentTask) => void;
  runSimulation: (modes: AgentMode[], context: string) => Promise<SimulationResult>;
  compareModes: (modes: AgentMode[]) => ModeComparison;
}
```

### 2.4 Focus Dashboard
Gerçek zamanlı strateji feedback'i:
- Cognitive load görselleştirme
- Aktif vektörlerin durumu
- Önerilen mod değişiklikleri

## 3. Entegrasyon Planı

### Phase 1: EventStream (1 gün)
- `lib/data-brain/event-stream.ts` oluştur
- Mevcut chat flow'a entegre et

### Phase 2: Simulation Engine (2 gün)
- `lib/data-brain/simulation.ts` oluştur
- UI: Mode seçimi öncesi simülasyon önerisi

### Phase 3: Enhanced Orchestrator (2 gün)
- AetherisStore'a yeni actions ekle
- Agent queue yönetimi

### Phase 4: Focus Dashboard (2 gün)
- `components/FocusDashboard.tsx` oluştur
- Real-time metrics gösterimi

## 4. Çıkartılan Bileşenler

| Bileşen | Neden Çıkartıldı |
|---------|------------------|
| Unified Identity Graph | Zaten userStore var |
| Consent Module | NextAuth + middleware yeterli |
| socket.io | Aşırı karmaşık, EventSource yeterli |
| Docker Agent Sandbox | MVP için aşırı |

## 5. Fayda/Maliyet Analizi

**Faydalar**:
- Kullanıcı mod seçmeden önce sonuçları görür
- Stratejik kararlar veriye dayanır
- Gerçek zamanlı feedback

**Maliyetler**:
- Simulation API çağrıları (cache ile minimize)
- EventStream bağlantı yönetimi
- ~500 satır yeni kod

**ROI**: Yüksek - kullanıcı deneyimi önemli ölçüde artar
