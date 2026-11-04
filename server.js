import http from 'node:http';
import { pathToFileURL } from 'node:url';
import worker from './src/index.js';
import { MAX_BODY_BYTES, checkContentLength, RequestError } from './src/http.js';

export function createServer() {
  return http.createServer({
    requestTimeout: 15_000,
    headersTimeout: 10_000,
    connectionsCheckingInterval: 1_000,
  }, async (req, res) => {
    try {
      checkContentLength(req.headers['content-length']);
      const chunks = [];
      let size = 0;
      // Keep the socket alive long enough to return a JSON 413 on chunked uploads.
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw new RequestError('请求体不能超过 16 KiB', 413);
        chunks.push(chunk);
      }
      const body = size ? Buffer.concat(chunks, size) : undefined;
      const request = new Request(new URL(req.url || '/', 'http://localhost'), {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : body,
      });
      const response = await worker.fetch(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (req.method === 'HEAD' || response.body == null) return res.end();
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      if (res.destroyed) return;
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error('[server] request failed', error);
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        connection: 'close',
      });
      res.end(JSON.stringify({ ok: false, error: status === 500 ? 'Internal Server Error' : error.message }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '0.0.0.0';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('PORT 必须是 1 到 65535 的整数');
  const server = createServer();
  server.listen(port, host, () => console.log(`[vps-value] listening on http://${host}:${port}`));

  function shutdown(signal) {
    console.log(`[vps-value] received ${signal}, shutting down`);
    server.close((error) => {
      if (error) console.error(error);
      process.exit(error ? 1 : 0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
