import { create } from "zustand";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  sentAt: string;
  isLocal: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  open: boolean;
  unread: number;
  addMessage:  (msg: Omit<ChatMessage, "id">) => void;
  loadHistory: (msgs: Omit<ChatMessage, "id">[]) => void;
  toggleOpen:  () => void;
  markRead:    () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  open: false,
  unread: 0,

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages.slice(-199),
        { ...msg, id: `${Date.now()}-${Math.random()}` },
      ],
      unread: s.open ? 0 : s.unread + 1,
    })),

  loadHistory: (msgs) =>
    set(() => ({
      messages: msgs.map((m, i) => ({ ...m, id: `hist-${i}-${m.sentAt}` })),
    })),

  toggleOpen: () =>
    set((s) => ({ open: !s.open, unread: !s.open ? 0 : s.unread })),

  markRead: () => set({ unread: 0 }),
}));
