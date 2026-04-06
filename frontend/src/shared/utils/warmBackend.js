let warmupPromise = null;

export function warmBackend() {
  if (import.meta.env.DEV) {
    return Promise.resolve();
  }

  if (warmupPromise) {
    return warmupPromise;
  }

  const baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl) {
    return Promise.resolve();
  }

  warmupPromise = fetch(`${baseUrl}/health`, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  }).catch(() => {
    // Warmup is best-effort only. Normal page requests will still handle errors.
  });

  return warmupPromise;
}
