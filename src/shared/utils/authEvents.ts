type Listener = () => void;

const listeners: Set<Listener> = new Set();

let sessionExpired = false;

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionExpired(): void {
  sessionExpired = true;
  listeners.forEach((fn) => fn());
}

export function isSessionExpired(): boolean {
  return sessionExpired;
}

export function resetSessionExpired(): void {
  sessionExpired = false;
}
