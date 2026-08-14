export interface CallProvider {
  createMeetUrl(conversationId: string): string;
}

// Uses meet.jit.si — free, no account required, no backend needed.
// Swap this class to integrate Google Meet / Zoom / custom WebRTC later.
export class JitsiCallProvider implements CallProvider {
  private readonly baseUrl: string;

  constructor(baseUrl = "https://meet.jit.si") {
    this.baseUrl = baseUrl;
  }

  createMeetUrl(conversationId: string): string {
    return `${this.baseUrl}/deskverse-${conversationId}`;
  }
}
