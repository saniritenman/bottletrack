export async function availableAppVersion(currentBuild, baseUrl, fetchRequest = fetch) {
  if (!currentBuild) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const url = new URL('./version.json', baseUrl);
    url.searchParams.set('check', String(Date.now()));
    const response = await fetchRequest(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    const info = await response.json();
    return typeof info?.build === 'string' && info.build !== currentBuild ? info.build : null;
  } catch { return null; } finally { clearTimeout(timer); }
}
