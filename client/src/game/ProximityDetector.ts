import { PROXIMITY_RADIUS, PROXIMITY_HYSTERESIS_MS } from "@shared/constants";
import type { PlayerState } from "@shared/types";

interface Entry {
  candidate: boolean;
  candidateSince: number;
  confirmed: boolean;
}

export class ProximityDetector {
  private entries = new Map<string, Entry>();
  private readonly onChange: (ids: string[]) => void;

  constructor(onChange: (ids: string[]) => void) {
    this.onChange = onChange;
  }

  update(localX: number, localY: number, remotePlayers: Record<string, PlayerState>): void {
    const now = Date.now();
    let changed = false;

    for (const [id, player] of Object.entries(remotePlayers)) {
      const dist = Math.hypot(player.x - localX, player.y - localY);
      const isClose = dist <= PROXIMITY_RADIUS;
      let entry = this.entries.get(id);

      if (!entry) {
        entry = { candidate: isClose, candidateSince: now, confirmed: false };
        this.entries.set(id, entry);
      }

      if (isClose !== entry.candidate) {
        entry.candidate = isClose;
        entry.candidateSince = now;
      }

      const hysteresisMet = now - entry.candidateSince >= PROXIMITY_HYSTERESIS_MS;
      const nextConfirmed = hysteresisMet ? entry.candidate : entry.confirmed;

      if (nextConfirmed !== entry.confirmed) {
        entry.confirmed = nextConfirmed;
        changed = true;
      }
    }

    for (const id of this.entries.keys()) {
      if (!(id in remotePlayers)) {
        if (this.entries.get(id)!.confirmed) changed = true;
        this.entries.delete(id);
      }
    }

    if (changed) {
      const nearby = [...this.entries.entries()]
        .filter(([, e]) => e.confirmed)
        .map(([id]) => id);
      this.onChange(nearby);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
