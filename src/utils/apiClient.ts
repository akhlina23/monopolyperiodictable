export interface SafeJsonResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  isNonJson?: boolean;
}

export function normalizeApiPath(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('./api/')) {
    return trimmed.slice(1);
  }
  if (trimmed.startsWith('api/')) {
    return `/${trimmed}`;
  }
  return trimmed;
}

export async function parseJsonResponse<T = any>(res: Response): Promise<SafeJsonResult<T>> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  if (!contentType.includes('application/json')) {
    const rawText = await res.text().catch(() => '');
    const snippet = rawText.trim().slice(0, 120).toLowerCase();
    const looksLikeHtml =
      snippet.startsWith('<!doctype') ||
      snippet.startsWith('<html') ||
      contentType.includes('text/html');

    return {
      ok: false,
      status: res.status,
      data: null,
      isNonJson: true,
      error: looksLikeHtml
        ? `Server mengembalikan halaman HTML (${res.status}) alih-alih JSON. Pastikan backend Express berjalan dan endpoint /api tersedia.`
        : `Server mengembalikan respons non-JSON (${res.status}${
            contentType ? `, ${contentType}` : ''
          }).`,
    };
  }

  try {
    const data = (await res.json()) as T;
    if (!res.ok) {
      const serverErr =
        data && typeof data === 'object' && 'error' in data && typeof (data as any).error === 'string'
          ? (data as any).error
          : `Server mengembalikan status ${res.status}.`;
      return {
        ok: false,
        status: res.status,
        data,
        error: serverErr,
      };
    }
    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: `Respons JSON dari server tidak valid (${res.status}).`,
    };
  }
}

export async function safeFetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<SafeJsonResult<T>> {
  const res = await fetch(normalizeApiPath(url), init);
  return parseJsonResponse<T>(res);
}
