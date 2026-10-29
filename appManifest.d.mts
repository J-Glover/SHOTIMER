import type { IncomingMessage, ServerResponse } from 'node:http';

export function createAppManifest(params: URLSearchParams, appPath?: string): Record<string, unknown>;
export function serveAppManifest(req: IncomingMessage, res: ServerResponse, next?: () => void): boolean;
