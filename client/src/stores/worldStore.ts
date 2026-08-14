import { create } from "zustand";
import type { PlayerState, ZoneState, Direction, PlayerStatus } from "@shared/types";

interface WorldState {
  remotePlayers: Record<string, PlayerState>;
  zones: ZoneState[];
  setSnapshot: (players: PlayerState[], zones: ZoneState[]) => void;
  addRemotePlayer: (player: PlayerState) => void;
  removeRemotePlayer: (id: string) => void;
  updateRemoteMove: (id: string, x: number, y: number, dir: Direction, anim: string) => void;
  updateRemoteStatus: (id: string, status: PlayerStatus) => void;
  updateZoneState: (zone: ZoneState) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  remotePlayers: {},
  zones: [],

  setSnapshot: (players, zones) =>
    set({ remotePlayers: Object.fromEntries(players.map((p) => [p.id, p])), zones }),

  addRemotePlayer: (player) =>
    set((s) => ({ remotePlayers: { ...s.remotePlayers, [player.id]: player } })),

  removeRemotePlayer: (id) =>
    set((s) => {
      const next = { ...s.remotePlayers };
      delete next[id];
      return { remotePlayers: next };
    }),

  updateRemoteMove: (id, x, y, direction, animation) =>
    set((s) => {
      const p = s.remotePlayers[id];
      if (!p) return {};
      return { remotePlayers: { ...s.remotePlayers, [id]: { ...p, x, y, direction, animation } } };
    }),

  updateRemoteStatus: (id, status) =>
    set((s) => {
      const p = s.remotePlayers[id];
      if (!p) return {};
      return { remotePlayers: { ...s.remotePlayers, [id]: { ...p, status } } };
    }),

  updateZoneState: (zone) =>
    set((s) => ({
      zones: [...s.zones.filter((z) => z.zoneId !== zone.zoneId), zone],
    })),
}));
