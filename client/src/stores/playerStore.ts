import { create } from "zustand";
import type { Direction, Position, PlayerStatus, Accessory } from "@shared/types";

interface LocalPlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  animation: string;
  avatarSkin: string;
  shirtIndex: number;
  hairColor: string;
  accessory: Accessory;
  pantsColor: string;
  status: PlayerStatus;
  init: (
    id: string, name: string, avatarSkin: string, shirtIndex: number,
    hairColor: string, accessory: Accessory, pantsColor: string
  ) => void;
  setPosition: (pos: Position) => void;
  setDirection: (dir: Direction) => void;
  setAnimation: (anim: string) => void;
  setStatus: (status: PlayerStatus) => void;
}

export const usePlayerStore = create<LocalPlayerState>((set) => ({
  id: "",
  name: "",
  x: 240,
  y: 420,
  direction: "down",
  animation: "idle",
  avatarSkin: "medium",
  shirtIndex: 0,
  hairColor: "#2c1a0e",
  accessory: "none",
  pantsColor: "#334155",
  status: "livre",
  init: (id, name, avatarSkin, shirtIndex, hairColor, accessory, pantsColor) =>
    set({ id, name, avatarSkin, shirtIndex, hairColor, accessory, pantsColor }),
  setPosition: (pos) => set({ x: pos.x, y: pos.y }),
  setDirection: (direction) => set({ direction }),
  setAnimation: (animation) => set({ animation }),
  setStatus: (status) => set({ status }),
}));
