import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export class SessionManager {
  private sessions = new Map<string, {
    transport: StreamableHTTPServerTransport;
    createdAt: number;
    metadata: Record<string, any>;
  }>();

  private cleanupInterval = 30 * 60 * 1000; // 30 minutes

  constructor() {
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  createSession(transport: StreamableHTTPServerTransport): string {
    const sessionId = randomUUID();
    this.sessions.set(sessionId, {
      transport,
      createdAt: Date.now(),
      metadata: {}
    });
    return sessionId;
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId)?.transport;
  }

  setMetadata(sessionId: string, key: string, value: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata[key] = value;
    }
  }

  getMetadata(sessionId: string, key: string) {
    return this.sessions.get(sessionId)?.metadata[key];
  }

  private cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > this.cleanupInterval) {
        this.sessions.delete(sessionId);
        console.log(`🗑️ Cleaned up session: ${sessionId}`);
      }
    }
  }
}
