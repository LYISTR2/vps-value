export const MAX_BODY_BYTES = 16 * 1024;

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function checkContentLength(value) {
  if (value != null && Number(value) > MAX_BODY_BYTES) {
    throw new RequestError('请求体不能超过 16 KiB', 413);
  }
}

export async function parseJsonBody(request) {
  checkContentLength(request.headers.get('content-length'));
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new RequestError('Content-Type 必须是 application/json');

  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  try {
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          // Cancellation must not wait for a client that is still sending data.
          void reader.cancel().catch(() => {});
          throw new RequestError('请求体不能超过 16 KiB', 413);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader?.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError('请求 JSON 格式错误');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestError('请求 JSON 必须是对象');
  }
  return body;
}
