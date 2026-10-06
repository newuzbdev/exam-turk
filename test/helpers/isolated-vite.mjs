import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

// SSR render tests must not replace an open dev server's optimized dependencies.
export async function createIsolatedViteTestServer(options = {}) {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'turkishmock-vite-test-'));
  try {
    const vite = await createServer({
      root: process.cwd(),
      appType: 'custom',
      ...options,
      cacheDir,
      plugins: [
        ...(options.plugins || []),
        {
          name: 'isolated-vite-test-watch',
          enforce: 'post',
          configResolved(config) {
            // Vite merges inline null with vite.config.ts's watch object.
            config.server.watch = null;
          },
        },
      ],
      optimizeDeps: { noDiscovery: true, include: [], ...options.optimizeDeps },
      server: {
        ...options.server,
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
    });
    const close = vite.close.bind(vite);
    vite.close = async () => {
      try { await close(); }
      finally { await rm(cacheDir, { recursive: true, force: true }); }
    };
    return vite;
  } catch (error) {
    await rm(cacheDir, { recursive: true, force: true });
    throw error;
  }
}
