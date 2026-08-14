export interface ZoneMusic {
  trackUri:   string;
  trackName:  string;
  artistName: string;
  startedAt:  number; // epoch ms
  isPlaying:  boolean;
  djId:       string;
  djName:     string;
}

export class ZoneMusicManager {
  private zoneMusic = new Map<string, ZoneMusic>();

  set(zoneId: string, music: ZoneMusic): void {
    this.zoneMusic.set(zoneId, music);
  }

  get(zoneId: string): ZoneMusic | undefined {
    return this.zoneMusic.get(zoneId);
  }

  togglePlayback(zoneId: string, isPlaying: boolean): ZoneMusic | undefined {
    const m = this.zoneMusic.get(zoneId);
    if (!m) return undefined;
    const updated = { ...m, isPlaying };
    this.zoneMusic.set(zoneId, updated);
    return updated;
  }

  clear(zoneId: string): void {
    this.zoneMusic.delete(zoneId);
  }

  entries(): IterableIterator<[string, ZoneMusic]> {
    return this.zoneMusic.entries();
  }
}
