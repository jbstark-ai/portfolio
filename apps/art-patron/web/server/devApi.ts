import type { Plugin } from 'vite'

/** Serves the API handler from the Vite dev server, mirroring the Netlify Function at /api/*. */
export function devApi(handler: (req: Request) => Promise<Response>): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const r = await handler(
          new Request(`http://localhost${req.originalUrl}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          }),
        )
        res.statusCode = r.status
        r.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await r.arrayBuffer()))
      })
    },
  }
}
