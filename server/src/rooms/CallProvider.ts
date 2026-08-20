export interface CallProvider {
  createMeetUrl(conversationId: string): string;
}

export class JitsiCallProvider implements CallProvider {
  private readonly baseUrl: string;

  constructor(baseUrl = "https://meet.jit.si") {
    this.baseUrl = baseUrl;
  }

  createMeetUrl(conversationId: string): string {
    return `${this.baseUrl}/deskverse-${conversationId}`;
  }
}
