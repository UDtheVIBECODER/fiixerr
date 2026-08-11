/**
 * Vercel Node.js serverless function — SSR adapter for TanStack Start.
 *
 * `vite build` creates dist/server/server.js which exports:
 *   export default { fetch(request: Request): Promise<Response> }
 *
 * This file wraps that Web-Fetch handler in the Node.js
 * IncomingMessage / ServerResponse interface that Vercel expects.
 *
 * vercel.json routes everything not found on the filesystem here.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

type WebFetchHandler = {
  fetch(request: Request, env?: unknown, ctx?: unknown): Promise<Response>;
};

// Module-level promise so the import is shared across warm invocations.
// The path is relative to this file (api/ → dist/server/server.js at project root).
// Vercel traces and bundles local file imports automatically.
// @ts-expect-error — dist/server is a build artifact produced by `vite build`
const handlerPromise: Promise<WebFetchHandler> = import(
  "../dist/server/server.js"
).then((mod: { default?: WebFetchHandler } | WebFetchHandler) => {
  const h = (mod as { default?: WebFetchHandler }).default ?? (mod as WebFetchHandler);
  if (typeof h?.fetch !== "function") {
    throw new Error("dist/server/server.js did not export a { fetch } handler");
  }
  return h;
});

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const server = await handlerPromise;

  // Reconstruct the full URL from Vercel forwarded headers.
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    req.headers.host ??
    "localhost";
  const url = new URL(req.url ?? "/", `${proto}://${host}`);

  // Read request body (GET / HEAD have no body).
  let bodyBuffer: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    bodyBuffer = await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
    });
    if (!bodyBuffer.length) bodyBuffer = undefined;
  }

  // Build a Web API Request from the Node.js IncomingMessage.
  const headerEntries: [string, string][] = [];
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    headerEntries.push([k, Array.isArray(v) ? v.join(", ") : v]);
  }

  const webRequest = new Request(url.toString(), {
    method: req.method,
    headers: new Headers(headerEntries),
    ...(bodyBuffer
      ? { body: bodyBuffer, duplex: "half" }
      : {}),
  } as RequestInit);

  // Call TanStack Start's SSR handler.
  const response = await server.fetch(webRequest);

  // Write status + headers back to the Node.js response.
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      res.setHeader(key, value);
    }
  });

  // set-cookie may have multiple values; use getSetCookie() when available.
  const setCookies: string[] =
    typeof (response.headers as unknown as { getSetCookie?(): string[] })
      .getSetCookie === "function"
      ? (
          response.headers as unknown as { getSetCookie(): string[] }
        ).getSetCookie()
      : [];
  if (setCookies.length > 0) {
    res.setHeader("set-cookie", setCookies);
  }

  // Stream the response body.
  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}
