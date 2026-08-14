import { create } from "zustand";
import type { InviteState, Conversation, RecadoMessage } from "@shared/types";
import type { ServerZoneJoinPrompt } from "@shared/events";

interface RecadoTarget {
  id: string;
  name: string;
}

interface ConversationState {
  pendingInvite: InviteState | null;
  sentInviteId: string | null;
  activeConversation: Conversation | null;
  zoneJoinPrompt: ServerZoneJoinPrompt | null;
  pendingRecados: RecadoMessage[];
  nearbyPlayerIds: string[];
  recadoTarget: RecadoTarget | null;
  error: string | null;

  setInvite: (invite: InviteState | null) => void;
  setSentInviteId: (id: string | null) => void;
  setConversation: (conv: Conversation | null) => void;
  setZonePrompt: (prompt: ServerZoneJoinPrompt | null) => void;
  setPendingRecados: (msgs: RecadoMessage[]) => void;
  setNearby: (ids: string[]) => void;
  setRecadoTarget: (target: RecadoTarget | null) => void;
  setError: (msg: string | null) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  pendingInvite: null,
  sentInviteId: null,
  activeConversation: null,
  zoneJoinPrompt: null,
  pendingRecados: [],
  nearbyPlayerIds: [],
  recadoTarget: null,
  error: null,

  setInvite: (pendingInvite) => set({ pendingInvite }),
  setSentInviteId: (sentInviteId) => set({ sentInviteId }),
  setConversation: (activeConversation) => set({ activeConversation }),
  setZonePrompt: (zoneJoinPrompt) => set({ zoneJoinPrompt }),
  setPendingRecados: (pendingRecados) => set({ pendingRecados }),
  setNearby: (nearbyPlayerIds) => set({ nearbyPlayerIds }),
  setRecadoTarget: (recadoTarget) => set({ recadoTarget }),
  setError: (error) => set({ error }),
}));
