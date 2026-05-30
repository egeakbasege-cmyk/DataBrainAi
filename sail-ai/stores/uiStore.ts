/**
 * stores/uiStore.ts — UI Domain Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns all transient UI state:
 *   • modal visibility
 *   • panel open/close
 *   • sidebar / drawer state
 *   • global toast queue
 *   • scroll anchor signals
 *
 * Zero business logic here — pure display state.
 */

import { create }                from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ── Toast ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id:        string
  message:   string
  variant:   ToastVariant
  durationMs?: number   // default 4000
}

// ── Modal IDs ─────────────────────────────────────────────────────────────────

export type ModalId =
  | 'paywall'
  | 'feedback'
  | 'export'
  | 'brand-setup'
  | 'connector'
  | 'tutorial'
  | 'settings'
  | null

// ── Store shape ───────────────────────────────────────────────────────────────

interface UIState {
  // Modals
  activeModal:     ModalId
  modalPayload:    unknown     // arbitrary data passed when opening

  // Panels
  isSidebarOpen:   boolean
  isGuideRailOpen: boolean
  isConnectorDockOpen: boolean

  // Scroll anchor — increment to trigger auto-scroll
  scrollAnchor:    number

  // Global loading overlay (for full-page transitions)
  isPageLoading:   boolean

  // Toast queue
  toasts:          Toast[]

  // ── Actions ─────────────────────────────────────────────────────────────

  openModal:       (id: Exclude<ModalId, null>, payload?: unknown) => void
  closeModal:      () => void

  setSidebar:      (open: boolean) => void
  setGuideRail:    (open: boolean) => void
  setConnectorDock:(open: boolean) => void
  toggleSidebar:   () => void

  triggerScrollToBottom: () => void

  setPageLoading:  (v: boolean) => void

  pushToast:       (toast: Omit<Toast, 'id'>) => void
  dismissToast:    (id: string) => void
  clearToasts:     () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    activeModal:        null,
    modalPayload:       null,
    isSidebarOpen:      false,
    isGuideRailOpen:    true,
    isConnectorDockOpen:false,
    scrollAnchor:       0,
    isPageLoading:      false,
    toasts:             [],

    openModal: (id, payload = null) => set({ activeModal: id, modalPayload: payload }),
    closeModal: ()                  => set({ activeModal: null, modalPayload: null }),

    setSidebar:       (open) => set({ isSidebarOpen: open }),
    setGuideRail:     (open) => set({ isGuideRailOpen: open }),
    setConnectorDock: (open) => set({ isConnectorDockOpen: open }),
    toggleSidebar:    ()     => set(s => ({ isSidebarOpen: !s.isSidebarOpen })),

    triggerScrollToBottom: () => set(s => ({ scrollAnchor: s.scrollAnchor + 1 })),

    setPageLoading: (v) => set({ isPageLoading: v }),

    pushToast: (t) => {
      const id = crypto.randomUUID()
      set(s => ({ toasts: [...s.toasts, { ...t, id }] }))
      // Auto-dismiss
      setTimeout(() => {
        set(s => ({ toasts: s.toasts.filter(x => x.id !== id) }))
      }, t.durationMs ?? 4_000)
    },

    dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })),
    clearToasts:  ()   => set({ toasts: [] }),
  }))
)

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectModal         = (s: UIState) => ({ id: s.activeModal, payload: s.modalPayload })
export const selectToasts        = (s: UIState) => s.toasts
export const selectScrollAnchor  = (s: UIState) => s.scrollAnchor
export const selectIsSidebarOpen = (s: UIState) => s.isSidebarOpen
