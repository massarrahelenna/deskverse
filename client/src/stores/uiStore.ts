import { create } from "zustand";

interface UiState {
  showPeople:    boolean;
  showAbout:     boolean;
  showSpotify:   boolean;
  showProfile:   boolean;
  togglePeople:  () => void;
  toggleAbout:   () => void;
  toggleSpotify: () => void;
  toggleProfile: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  showPeople:    false,
  showAbout:     false,
  showSpotify:   false,
  showProfile:   false,
  togglePeople:  () => set((s) => ({ showPeople:  !s.showPeople })),
  toggleAbout:   () => set((s) => ({ showAbout:   !s.showAbout })),
  toggleSpotify: () => set((s) => ({ showSpotify: !s.showSpotify })),
  toggleProfile: () => set((s) => ({ showProfile: !s.showProfile })),
}));
