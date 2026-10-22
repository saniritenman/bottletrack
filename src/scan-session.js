export function createScanGate() {
  let lastCode = '', lastSeen = 0, lastAccepted = -Infinity;
  return {
    accept(code, now = Date.now()) {
      const value = String(code || '').trim();
      if (!value) return false;
      if (value === lastCode && now - lastSeen < 1200) { lastSeen = now; return false; }
      if (now - lastAccepted < 700) return false;
      lastCode = value; lastSeen = now; lastAccepted = now;
      return true;
    },
    resume(now = Date.now()) { lastSeen = now; },
  };
}
