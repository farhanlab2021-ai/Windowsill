/**
 * UI-only state shared across components (not saved to the database):
 * which tree items are expanded, whether the mobile sidebar is open, toasts.
 *
 * Built with zustand: `useUI((s) => s.sidebarOpen)` reads a value and the
 * component re-renders only when that value changes.
 */
import { create } from "zustand";

const EXPANDED_KEY = "windowsill-expanded";

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveExpanded(ids: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]));
  } catch {}
}

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  templateDialogOpen: boolean;
  setTemplateDialogOpen: (open: boolean) => void;

  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  expandedIds: Set<string>;
  hydrateExpanded: () => void;
  setExpanded: (id: string, expanded: boolean) => void;

  /** A long task in progress, e.g. "Importing “Lecture 5.pdf” — page 3 of 40" (null = nothing running). */
  busyMessage: string | null;
  setBusyMessage: (message: string | null) => void;

  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
}

let toastCounter = 0;

export const useUI = create<UIState>((set, get) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  templateDialogOpen: false,
  setTemplateDialogOpen: (templateDialogOpen) => set({ templateDialogOpen, sidebarOpen: false }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen, sidebarOpen: false }),

  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen, sidebarOpen: false }),

  expandedIds: new Set(),
  hydrateExpanded: () => set({ expandedIds: loadExpanded() }),
  setExpanded: (id, expanded) => {
    const next = new Set(get().expandedIds);
    if (expanded) next.add(id);
    else next.delete(id);
    saveExpanded(next);
    set({ expandedIds: next });
  },

  busyMessage: null,
  setBusyMessage: (busyMessage) => set({ busyMessage }),

  toasts: [],
  showToast: (toast) => {
    const id = ++toastCounter;
    set({ toasts: [...get().toasts, { ...toast, id }] });
    setTimeout(() => get().dismissToast(id), 8000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
