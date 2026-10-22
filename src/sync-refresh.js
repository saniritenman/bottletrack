// iOS suspends timers in the background. Resume events must also check for changes.
export function startSyncRefresh(refresh, onError, {
  windowTarget = window,
  documentTarget = document,
  intervalMs = 2000,
} = {}) {
  let stopped = false;
  let running = false;
  const check = async () => {
    if (stopped || running || documentTarget.hidden) return;
    running = true;
    try {
      await refresh(() => !stopped);
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(check, intervalMs);
  const events = ['online', 'pageshow', 'focus'];
  for (const event of events) windowTarget.addEventListener(event, check);
  documentTarget.addEventListener('visibilitychange', check);
  void check();
  return () => {
    stopped = true;
    clearInterval(timer);
    for (const event of events) windowTarget.removeEventListener(event, check);
    documentTarget.removeEventListener('visibilitychange', check);
  };
}
