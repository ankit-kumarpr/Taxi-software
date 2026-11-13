/** Backend API helpers for the public website. */

export function getApiBaseUrl() {
  const raw =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://taxi-software.onrender.com/api/v1";
  return raw.replace(/\/+$/, "");
}

export function getApiOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.API_ORIGIN;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return getApiBaseUrl().replace(/\/api\/v1$/i, "");
}

export function mediaUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";
  const value = String(pathOrUrl).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${getApiOrigin()}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; message?: string }> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | (T & { success?: boolean; message?: string; data?: unknown })
      | null;
    return {
      ok: res.ok,
      status: res.status,
      data: (json as T) || null,
      message: json && typeof json === "object" && "message" in json ? String(json.message) : undefined,
    };
  } catch {
    return { ok: false, status: 0, data: null, message: "Network error. Please try again." };
  }
}
