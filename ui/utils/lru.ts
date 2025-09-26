// Lightweight generic LRU cache with bounded entries
// Designed for UI use (heights/content caches). Evicts least-recently-used on set when over capacity.

export class LruCache<V> {
  private maxEntries: number;
  private map: Map<string, V>;

  constructor(maxEntries: number) {
    this.maxEntries = Math.max(1, maxEntries);
    this.map = new Map();
  }

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    // refresh recency
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    this.evictIfNeeded();
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  private evictIfNeeded(): void {
    while (this.map.size > this.maxEntries) {
      // Evict least-recently-used entry (first inserted)
      const lruKey = this.map.keys().next().value as string | undefined;
      if (typeof lruKey === 'undefined') break;
      this.map.delete(lruKey);
    }
  }
}

export default LruCache;
