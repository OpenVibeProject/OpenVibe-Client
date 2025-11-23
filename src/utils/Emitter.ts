type Listener = (payload?: any) => void;

export class Emitter {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, fn: Listener) {
    const s = this.listeners.get(event) ?? new Set();
    s.add(fn);
    this.listeners.set(event, s);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Listener) {
    const s = this.listeners.get(event);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) this.listeners.delete(event);
  }

  emit(event: string, payload?: any) {
    const s = this.listeners.get(event);
    if (!s) return;
    for (const fn of Array.from(s)) fn(payload);
  }
}
