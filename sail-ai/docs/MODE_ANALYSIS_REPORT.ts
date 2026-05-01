/**
 * Aetheris Mode Analysis & Enhancement Report
 * 
 * Mevcut 6 modun detaylı analizi ve güçlendirme önerileri
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOD ANALİZİ
// ═══════════════════════════════════════════════════════════════════════════════

/*
┌─────────────────┬─────────────────────────────────────────────────────────────┐
│ MOD             │ GÖREV / FELSEFE                                             │
├─────────────────┼─────────────────────────────────────────────────────────────┤
│ UPWIND          │ Doğrudan strateji - Hızlı, veri odaklı analiz              │
│ DOWNWIND        │ Rehberli diyalog - Derinlemesine keşif ve ikinci derece    │
│ SAIL            │ Adaptif akış - Analitik veya koçluk, otomatik seçim        │
│ TRIM            │ Fazlı timeline - Hesaplamalı yol haritası                  │
│ CATAMARAN       │ Çift izlek - Market Growth + CX paralel strateji           │
│ OPERATOR        │ Evrensel derin zeka - En kapsamlı mod                      │
└─────────────────┴─────────────────────────────────────────────────────────────┘
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 1. UPWIND - Doğrudan Strateji Modu
// ═══════════════════════════════════════════════════════════════════════════════

const UPWIND_ANALYSIS = {
  gorev: 'Hızlı, veri odaklı stratejik analiz sunmak',
  hedefKitle: 'Metriklerini bilen, hızlı sonuç isteyen operatörler',
  
  gucluYonler: [
    'JSON formatı yapılandırılmış ve tutarlı',
    'Benchmark zorunluluğu var',
    'Confidence Index sayısal değer veriyor',
    'Execution Horizons (30/60/90 gün) net',
    'Impact Projection maliyet hesabı yapıyor'
  ],
  
  zayifYonler: [
    'Cognitive Load parametresi etkisiz - her yük seviyesinde aynı çıktı',
    'Matrix Options her zaman 2-3 arasında, bazen 1 veya 4 daha uygun olabilir',
    'Sector Median Success Rate genelde 0.6-0.8 arası, gerçekçi değil',
    'Density Score hesaplanmıyor, sabit değerler geliyor',
    'Dil değişiminde benchmark referansları kayboluyor'
  ],
  
  kritikHatalar: [
    'Eksik veri durumunda "request before proceeding" demesine rağmen devam ediyor',
    'Confidence Index 0.6 altındaysa yine de matrix options üretiyor',
    'Impact Projection bazen gerçekçi olmayan £/$ değerler üretiyor'
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DOWNWIND - Rehberli Diyalog Modu
// ═══════════════════════════════════════════════════════════════════════════════

const DOWNWIND_ANALYSIS = {
  gorev: 'Sokratik diyalog ile derinlemesine keşif yapmak',
  hedefKitle: 'Belirsizlik içinde olan, neden-sonuç anlamak isteyenler',
  
  gucluYonler: [
    'Conversational yapı doğal hissettiriyor',
    'Follow-up question mekanizması var',
    'CoachCard görsel olarak ayrılmış',
    'İkinci derece etkileri (second-order effects) tartışıyor'
  ],
  
  zayifYonler: [
    'Sadece tek bir follow-up question, daha fazla derinleşme yok',
    'Trade-off analizi yüzeysel kalıyor',
    'Kullanıcı cevabını beklemek yerine hemen devam ediyor',
    'Session memory yok - önceki cevapları hatırlamıyor',
    'Coach ve Analiz arasındaki geçiş sert'
  ],
  
  kritikHatalar: [
    'Sokratik yöntem uygulanmıyor - sormak yerine söylüyor',
    'Açık uçlu sorular yerine çoktan seçmeli gibi yapılandırılmış',
    'Kullanıcı "anlamadım" dediğinde adapte olmuyor'
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SAIL - Adaptif Akış Modu
// ═══════════════════════════════════════════════════════════════════════════════

const SAIL_ANALYSIS = {
  gorev: 'Sorgu tipine göre otomatik analitik veya koçluk seçimi',
  hedefKitle: 'Hangi modu seçeceğini bilmeyen kullanıcılar',
  
  gucluYonler: [
    'INTENT detection mekanizması var',
    'Streaming yapı hızlı hissettiriyor',
    'Analitik ve koçluk arası otomatik geçiş',
    'Markdown formatı zengin'
  ],
  
  zayifYonler: [
    'INTENT detection bazen yanlış - analitik sorguyu koçluk olarak sınıflandırıyor',
    'INTENT token stream başında, görünür oluyor (kullanıcı görmemeli)',
    'Koçluk modunda benchmark zorunluluğu yok',
    'Analitik modunda JSON yapısı yok, sadece markdown',
    'Max tokens 1200 - karmaşık sorgular için yetersiz'
  ],
  
  kritikHatalar: [
    'INTENT token kullanıcıya görünüyor - [INTENT:analytic] metin içinde',
    'Analitik modda yapılandırılmış veri yok - sadece serbest metin',
    'Koçluk modunda derinlemesine gitmiyor, yüzeysel kalıyor'
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TRIM - Fazlı Timeline Modu
// ═══════════════════════════════════════════════════════════════════════════════

const TRIM_ANALYSIS = {
  gorev: 'Hesaplamalı, faz bazlı stratejik yol haritası',
  hedefKitle: 'Uzun vadeli planlama yapmak isteyenler',
  
  gucluYonler: [
    'Phase yapısı net (3-4 faz)',
    'Her fazda metric ve deltaTarget var',
    'Diagnostic bölümü root cause analizi yapıyor',
    'Cost of Delay hesaplaması var',
    'Success Indicator projection matematiksel'
  ],
  
  zayifYonler: [
    'Phase isimleri generic (Foundation, Growth, Scale)',
    'Timeframe hesaplamaları gerçekçi değil',
    'Actions her fazda 2-4 arası ama bazen 1 yeterli',
    'DeltaTarget bazen imkansız değerler içeriyor',
    'Verification Pass içsel ama çıktıda görünmüyor'
  ],
  
  kritikHatalar: [
    'Eksik KPI durumunda request etmesi gerekirken devam ediyor',
    'Cost of Delay her zaman £/$ cinsinden, bazen % daha uygun',
    'Phase geçişleri arasındaki bağımlılıklar belirtilmiyor'
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CATAMARAN - Çift İzlek Modu
// ═══════════════════════════════════════════════════════════════════════════════

const CATAMARAN_ANALYSIS = {
  gorev: 'Market Growth ve Customer Experience paralel strateji',
  hedefKitle: 'Kapsamlı sistem değişikliği isteyenler',
  
  gucluYonler: [
    'Dual-track yapı benzersiz',
    'Unified Strategy bütünleşme mantığı var',
    'Her trackte 3 action limiti net',
    'Greatest Risk belirtiliyor',
    'ThirtyDayTarget her iki track için ayrı'
  ],
  
  zayifYonler: [
    'Unified Strategy genelde yüzeysel - "reinforce each other" tekrarı',
    'Market Growth ve CX arasındaki etkileşim matematiksel değil',
    'Confidence Index 0-100 arası ama hesaplama mantığı yok',
    'Action sayısı SADECE 3, bazen 2 veya 4 daha iyi',
    'Expected Impact her zaman % cinsinden, bazen £/$ gerekli'
  ],
  
  kritikHatalar: [
    'JSON parse hataları sık (loglarda görülüyor)',
    'Eksik veri durumunda actions boş array geliyor',
    'Trackler arası öncelik belirtilmiyor - hangisi önce?'
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. OPERATOR - Evrensel Derin Zeka Modu
// ═══════════════════════════════════════════════════════════════════════════════

const OPERATOR_ANALYSIS = {
  gorev: 'En kapsamlı, evrensel derin analiz',
  hedefKitle: 'En zorlu ve karmaşık problemler',
  
  gucluYonler: [
    'En yüksek max_tokens (2000)',
    'En düşük temperature (0.5) - tutarlı',
    'buildOperatorSystemPrompt ayrı dosyada, genişletilebilir',
    'Streaming yapı ile gerçek zamanlı'
  ],
  
  zayifYonler: [
    'Prompt detayları görünmüyor - buildOperatorSystemPrompt içeriği bilinmiyor',
    'Diğer modlardan farkı belirsiz - ne zaman kullanılacağı net değil',
    'Output formatı belirsiz - JSON mu markdown mu?',
    'Diğer modların özelliklerini içermiyor (benchmark, timeline vb.)'
  ],
  
  kritikHatalar: [
    'Kullanıcı arayüzünde OPERATOR modu seçilemiyor (sadece kodda var)',
    'Diğer modlarla çakışma riski - aynı işi yapıyor gibi görünüyor',
    'Max tokens yüksek ama kullanıcı bunun faydasını göremiyor'
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENEL KRİTİK SORUNLAR
// ═══════════════════════════════════════════════════════════════════════════════

const GENEL_SORUNLAR = {
  dilDestegi: [
    'Türkçe benchmark verileri yetersiz',
    'Çeviri sonrası benchmark referansları kayboluyor',
    'Dil değişiminde ton değişiyor (İngilizce daha otoriter)'
  ],
  
  veriKalitesi: [
    'Eksik veri durumunda "(est.)" etiketi kullanılıyor ama gerçekçi değil',
    'Sector benchmark verileri güncel değil (2024 verileri kullanılıyor)',
    'Kullanıcı metrikleri ile sector median arasındaki gap hesaplaması hatalı'
  ],
  
  kullaniciDeneyimi: [
    'Mod seçimi kullanıcıya bırakılmış, otomatik öneri yok',
    'Mod değişiminde context kayboluyor',
    'Session bazlı öğrenme yok - aynı kullanıcı tekrar geldiğinde sıfırdan başlıyor'
  ]
}

export {
  UPWIND_ANALYSIS,
  DOWNWIND_ANALYSIS,
  SAIL_ANALYSIS,
  TRIM_ANALYSIS,
  CATAMARAN_ANALYSIS,
  OPERATOR_ANALYSIS,
  GENEL_SORUNLAR
}
