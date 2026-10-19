import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.webmanifest"), "utf8")) as {
  name: string; start_url: string; display: string; scope: string; lang: string;
  icons: Array<{ src: string; sizes: string; purpose: string }>;
};
const worker = readFileSync(resolve(root, "public/sw.js"), "utf8");
const offline = readFileSync(resolve(root, "public/offline.html"), "utf8");

describe("PWA NOVAGENTE", () => {
  it("usa identidade e manifest instalavel pt-BR", () => {
    expect(manifest.name).toContain("NOVAGENTE");
    expect(manifest.lang).toBe("pt-BR");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url).toBe("/inicio");
    expect(manifest.display).toBe("standalone");
  });
  it("oferece icones 192, 512 e maskable, e Apple Touch", () => {
    expect(manifest.icons.some(i => i.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some(i => i.sizes === "512x512")).toBe(true);
    expect(manifest.icons.some(i => i.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) {
      const buffer = readFileSync(resolve(root, "public", icon.src.slice(1)));
      expect(buffer.subarray(1,4).toString()).toBe("PNG");
    }
    expect(statSync(resolve(root, "public/icons/apple-touch-icon.png")).size).toBeGreaterThan(1000);
  });
  it("nao interceta API privada nem cacheia HTML autenticado", () => {
    expect(worker).toContain('req.mode === "navigate"');
    expect(worker).toContain("fetch(req).catch");
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain('url.pathname.startsWith("/_next/static/")');
    expect(worker).not.toContain("caches.put(req,");
    expect(offline).toContain("Sem conexão");
    expect(offline).not.toContain("localStorage");
  });
});
