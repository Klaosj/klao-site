import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The route's only collaborators are Notion (resolveImageUrl) and the network
// (fetch); both are mocked so these tests pin the route's own decisions:
// what it fetches, what it passes on, and when it falls back.
const resolveImageUrl = vi.hoisted(() => vi.fn<(ref: string[]) => Promise<string | null>>());
vi.mock('@/lib/notion', () => ({ resolveImageUrl }));

import { GET } from '@/app/api/img/[...ref]/route';

const S3 = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/ws/file/aje-phone.jpg?X-Amz-Signature=abc';
const REF = ['page', '3d7a127d90d781ecb3a5e2594b9fd266', 'ScreenshotPhone'];
const IMAGE_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
// Kept in step with the route's MAX_BYTES (not exported: a route file may
// only export Next's route fields).
const MAX_BYTES = 4 * 1024 * 1024;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

// The request carries a URL of its own in the query on purpose: the route must
// never fetch anything it reads from the request, only what Notion returns.
const call = (ref = REF) =>
  GET(new Request(`https://klao.test/api/img/${ref.join('/')}?u=https://evil.test/x.png`), {
    params: Promise.resolve({ ref }),
  });

function expectPlaceholder(res: Response) {
  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toBe('/images/placeholder.svg');
  expect(res.headers.get('cache-control')).toBe('public, max-age=60');
}

// A body that arrives in chunks with no Content-Length, as a chunked upstream
// would send it, so only the running byte count can stop it.
function chunked(total: number, chunk = 256 * 1024): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(c) {
      if (sent >= total) return c.close();
      const n = Math.min(chunk, total - sent);
      sent += n;
      c.enqueue(new Uint8Array(n));
    },
  });
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NOTION_TOKEN', 'test-token');
  vi.stubGlobal('fetch', fetchMock);
  resolveImageUrl.mockResolvedValue(S3);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  warn.mockRestore();
});

describe('GET /api/img/[...ref]: serves the Notion image from this origin', () => {
  it('answers 200 with the upstream bytes, its image content-type and the shared cache header', async () => {
    fetchMock.mockResolvedValue(new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } }));
    const res = await call();

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    // public + s-maxage lets Vercel's edge keep it; an image replaced in
    // Notion shows within about an hour, like the text through ISR.
    expect(res.headers.get('cache-control')).toBe(IMAGE_CACHE);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG);

    // Not an open proxy: the ref goes to Notion, and the one URL fetched is
    // the one Notion returned, never the request's own query.
    expect(resolveImageUrl).toHaveBeenCalledWith(REF);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(S3);
  });

  it('passes an image of exactly the size limit', async () => {
    fetchMock.mockResolvedValue(
      new Response(chunked(MAX_BYTES), { status: 200, headers: { 'content-type': 'image/png' } }),
    );
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBe(MAX_BYTES);
  });
});

describe('GET /api/img/[...ref]: every failure is the neutral placeholder', () => {
  it('without NOTION_TOKEN, asking neither Notion nor the network', async () => {
    vi.stubEnv('NOTION_TOKEN', '');
    expectPlaceholder(await call());
    expect(resolveImageUrl).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('when Notion cannot resolve the ref, without fetching anything', async () => {
    resolveImageUrl.mockResolvedValue(null);
    expectPlaceholder(await call(['block', 'not-a-real-id']));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['text/html; charset=utf-8', 'application/octet-stream', 'application/xml'])(
    'when the upstream content-type is %s, not image/*',
    async (type) => {
      fetchMock.mockResolvedValue(new Response(JPEG, { status: 200, headers: { 'content-type': type } }));
      expectPlaceholder(await call());
    },
  );

  it('when the upstream sends no content-type at all', async () => {
    fetchMock.mockResolvedValue(new Response(JPEG, { status: 200 }));
    expectPlaceholder(await call());
  });

  it.each([404, 403, 500])('when the upstream answers %i', async (status) => {
    fetchMock.mockResolvedValue(new Response(JPEG, { status, headers: { 'content-type': 'image/jpeg' } }));
    expectPlaceholder(await call());
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('when the network call itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expectPlaceholder(await call());
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('when the upstream declares more than the size limit, before reading the body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JPEG, {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': String(MAX_BYTES + 1) },
      }),
    );
    expectPlaceholder(await call());
  });

  it('when an undeclared body runs past the size limit', async () => {
    fetchMock.mockResolvedValue(
      new Response(chunked(MAX_BYTES + 1), { status: 200, headers: { 'content-type': 'image/jpeg' } }),
    );
    expectPlaceholder(await call());
  });

  it('when the upstream has not answered after 8 s', async () => {
    vi.useFakeTimers();
    let fetchStarted!: () => void;
    const started = new Promise<void>((r) => (fetchStarted = r));
    // Never answers on its own; only the route's abort signal ends it.
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
          fetchStarted();
        }),
    );

    let settled = false;
    const pending = call().then((r) => {
      settled = true;
      return r;
    });
    await started;
    await vi.advanceTimersByTimeAsync(7_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expectPlaceholder(await pending);
  });
});
