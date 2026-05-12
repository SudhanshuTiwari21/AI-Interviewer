import "server-only";

/**
 * LiveKit dashboard often shows `LIVEKIT_URL=wss://<project>.livekit.cloud`.
 * This app historically used `LIVEKIT_HOST`. Accept either, and normalize so
 * RoomService uses `https://…` and the browser uses `wss://…`.
 */
export function readLiveKitHostRaw(): string | null {
  const fromUrl = process.env.LIVEKIT_URL?.trim();
  const fromHost = process.env.LIVEKIT_HOST?.trim();
  return fromUrl || fromHost || null;
}

function assertSensibleHostname(hostname: string, originalRaw: string) {
  if (!hostname) {
    throw new Error(
      `Invalid LiveKit URL/host in LIVEKIT_URL / LIVEKIT_HOST: "${originalRaw}". Expected something like wss://your-project.livekit.cloud`,
    );
  }
  if (hostname === "wss" || hostname === "ws" || hostname === "http" || hostname === "https") {
    throw new Error(
      `Invalid LiveKit host "${hostname}" (from "${originalRaw}"). ` +
        `Do not set LIVEKIT_HOST to just "wss". Use the full WebSocket URL from LiveKit (e.g. wss://your-project.livekit.cloud) as LIVEKIT_URL, ` +
        `or set LIVEKIT_HOST to the hostname only (your-project.livekit.cloud) or https://your-project.livekit.cloud.`,
    );
  }
}

function parseHostnameAndPort(raw: string): { hostname: string; port?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Missing LIVEKIT_URL or LIVEKIT_HOST.");
  }

  let toParse = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(toParse)) {
    toParse = `https://${toParse}`;
  }

  let url: URL;
  try {
    url = new URL(toParse);
  } catch {
    throw new Error(`Invalid LiveKit URL/host: "${trimmed}"`);
  }

  const hostname = url.hostname;
  assertSensibleHostname(hostname, trimmed);
  const port = url.port || undefined;
  return { hostname, port };
}

export function liveKitHttpsBase(): string {
  const raw = readLiveKitHostRaw();
  if (!raw) {
    throw new Error("Missing LIVEKIT_URL or LIVEKIT_HOST (and LIVEKIT_API_KEY / LIVEKIT_API_SECRET).");
  }
  const { hostname, port } = parseHostnameAndPort(raw);
  const suffix = port ? `:${port}` : "";
  return `https://${hostname}${suffix}`;
}

export function liveKitWssBase(): string {
  const raw = readLiveKitHostRaw();
  if (!raw) {
    throw new Error("Missing LIVEKIT_URL or LIVEKIT_HOST (and LIVEKIT_API_KEY / LIVEKIT_API_SECRET).");
  }
  const { hostname, port } = parseHostnameAndPort(raw);
  const suffix = port ? `:${port}` : "";
  return `wss://${hostname}${suffix}`;
}
