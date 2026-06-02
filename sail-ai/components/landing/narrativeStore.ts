/**
 * components/landing/narrativeStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand state machine powering the gamified branching narrative.
 * Five nodes map 1-to-1 to iPhone screens and background scenes.
 *
 * INTRO → DIAGNOSE → STRATEGIZE → EXECUTE → CONVERT
 *
 * Each advance: triggers background color/particle transition, optionally
 * fires the video-gen API for a Luma/Runway generated video overlay.
 */
'use client'

import { create } from 'zustand'

// ── Narrative nodes ───────────────────────────────────────────────────────────

export type NarrativeNode =
  | 'INTRO'        // Midnight ocean, stars
  | 'DIAGNOSE'     // Dawn horizon, fog lifting
  | 'STRATEGIZE'   // Golden hour, sail emerging
  | 'EXECUTE'      // Full sail, sunlit ocean
  | 'CONVERT'      // Harbour arrival, warm bokeh

// ── Scene configs — drives both WebGL shader and video-gen API ────────────────

export interface SceneConfig {
  label:        string
  tagline:      string
  videoPrompt:  string                       // Sent to Luma/Runway
  bg:           string                       // CSS gradient fallback
  accentHex:    string                       // Particle / glow tint
  accentRgb:    [number, number, number]     // For shader uniforms
  particleSpeed: number                      // 0.1 – 2.0
  particleBright: number                     // 0.0 – 1.0
}

export const SCENES: Record<NarrativeNode, SceneConfig> = {
  INTRO: {
    label:    'Beginning',
    tagline:  'Your business has a heading. Is it right?',
    videoPrompt:
      'Cinematic aerial drone shot of a dark midnight ocean, stars perfectly reflected on glass-calm water, slow pull-back, moonlit waves, no text, ultra-realistic 4K, photographic',
    bg:       'radial-gradient(ellipse at 50% 60%, #0C1929 0%, #040818 70%, #020610 100%)',
    accentHex:  '#14B8A6',
    accentRgb:  [20, 184, 166],
    particleSpeed:  0.18,
    particleBright: 0.35,
  },
  DIAGNOSE: {
    label:    'Diagnosis',
    tagline:  'Every great voyage starts with an honest map.',
    videoPrompt:
      'Cinematic ocean horizon at pre-dawn, fog slowly lifting off the water, first blush of orange-gold light on low clouds, a sailing vessel silhouette in the far distance, no text, ultra-realistic 4K',
    bg:       'radial-gradient(ellipse at 40% 55%, #111827 0%, #080E20 60%, #040818 100%)',
    accentHex:  '#2DD4BF',
    accentRgb:  [45, 212, 191],
    particleSpeed:  0.45,
    particleBright: 0.5,
  },
  STRATEGIZE: {
    label:    'Strategy',
    tagline:  'A precision strategy is a competitive weapon.',
    videoPrompt:
      'Golden hour over open ocean, luxury sailing yacht at full sail, champagne-gold light on rippling water, cinematic upward tilt shot, no text, ultra-realistic 4K, photographic',
    bg:       'radial-gradient(ellipse at 55% 45%, #1C1830 0%, #0A0D18 60%, #040818 100%)',
    accentHex:  '#C9A96E',
    accentRgb:  [201, 169, 110],
    particleSpeed:  0.85,
    particleBright: 0.7,
  },
  EXECUTE: {
    label:    'Execution',
    tagline:  'Velocity without direction is just noise.',
    videoPrompt:
      'Luxury superyacht cutting through sunlit Mediterranean waters at speed, full white sails, dramatic golden light rays through rigging, cinematic slow-motion, no text, ultra-realistic 4K',
    bg:       'radial-gradient(ellipse at 50% 40%, #221A0E 0%, #0C0A1A 55%, #040818 100%)',
    accentHex:  '#D4BC8A',
    accentRgb:  [212, 188, 138],
    particleSpeed:  1.4,
    particleBright: 0.88,
  },
  CONVERT: {
    label:    'Arrival',
    tagline:  'The best strategies compound. Save yours.',
    videoPrompt:
      'Superyacht arriving at a golden harbour at dusk, warm bokeh lights reflecting on water, cinematic rack-focus from ropes to horizon, no text, triumphant mood, ultra-realistic 4K, photographic',
    bg:       'radial-gradient(ellipse at 50% 60%, #181008 0%, #08060E 55%, #020408 100%)',
    accentHex:  '#F5ECD7',
    accentRgb:  [245, 236, 215],
    particleSpeed:  0.25,
    particleBright: 0.55,
  },
}

export const NODE_ORDER: NarrativeNode[] = [
  'INTRO', 'DIAGNOSE', 'STRATEGIZE', 'EXECUTE', 'CONVERT',
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface NarrativeStore {
  node:        NarrativeNode
  videoUrl:    string | null
  isGenerating: boolean
  history:     NarrativeNode[]

  advance:     (to: NarrativeNode) => void
  setVideoUrl: (url: string | null) => void
  setGenerating: (v: boolean) => void
  next:        () => void
}

export const useNarrative = create<NarrativeStore>((set, get) => ({
  node:         'INTRO',
  videoUrl:     null,
  isGenerating: false,
  history:      ['INTRO'],

  advance: (to) => set((s) => ({
    node:         to,
    videoUrl:     null,
    isGenerating: false,
    history:      [...s.history, to],
  })),

  setVideoUrl:   (url)  => set({ videoUrl: url, isGenerating: false }),
  setGenerating: (v)    => set({ isGenerating: v }),

  next: () => {
    const { node } = get()
    const idx  = NODE_ORDER.indexOf(node)
    const next = NODE_ORDER[idx + 1]
    if (next) get().advance(next)
  },
}))
