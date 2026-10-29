import type { IncomingMessage, ServerResponse } from 'node:http';
export function createLiveRelay(options?: { directory?: string; heartbeatMs?: number }): {
  middleware(req: IncomingMessage, res: ServerResponse, next?: () => void): boolean;
  close(): void;
};
