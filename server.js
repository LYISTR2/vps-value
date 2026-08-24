import http from 'node:http';
import worker from './src/index.js';

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : body,
    });
    const response = await worker.fetch(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (req.method === 'HEAD' || response.body == null) return res.end();
    const payload = Buffer.from(await response.arrayBuffer());
    res.end(payload);
  } catch (error) {
    console.error('[server] request failed', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
  }
});

server.listen(port, host, () => {
  console.log(`[vps-value] listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[vps-value] received ${signal}, shutting down`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
