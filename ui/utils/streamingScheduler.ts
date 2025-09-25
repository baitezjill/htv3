type ProviderKey = string; // `${sessionId}:${roundId}:${providerId}`

export interface EnqueuePayloadMeta {
  [key: string]: any;
}

export interface SchedulerSnapshot {
  committedText: string;
  tailText: string;
  pendingCount: number;
  paused: boolean;
  meta?: EnqueuePayloadMeta;
  isFinal?: boolean;
}

interface InternalState {
  committedText: string;
  tailText: string;
  queue: string[];
  lastCommitAt: number;
  paused: boolean;
  pendingCount: number;
  meta?: EnqueuePayloadMeta;
  completed: boolean;
}

export interface StreamingSchedulerOptions {
  maxUpdatesPerFrame?: number; // default 4
  commitIntervalMinMs?: number; // default 150
  commitIntervalMaxMs?: number; // default 300
  tailCommitCharThreshold?: number; // default 300
  backpressureMaxPending?: number; // default 10
  onApply: (key: ProviderKey, snapshot: SchedulerSnapshot) => void;
}

export class StreamingScheduler {
  private opts: Required<Omit<StreamingSchedulerOptions, 'onApply'>> & { onApply: StreamingSchedulerOptions['onApply'] };
  private states: Map<ProviderKey, InternalState> = new Map();
  private rafId: number | null = null;
  private dirtyKeys: Set<ProviderKey> = new Set();

  constructor(options: StreamingSchedulerOptions) {
    this.opts = {
      maxUpdatesPerFrame: options.maxUpdatesPerFrame ?? 4,
      commitIntervalMinMs: options.commitIntervalMinMs ?? 150,
      commitIntervalMaxMs: options.commitIntervalMaxMs ?? 300,
      tailCommitCharThreshold: options.tailCommitCharThreshold ?? 300,
      backpressureMaxPending: options.backpressureMaxPending ?? 10,
      onApply: options.onApply,
    };
  }

  private key(sessionId: string | null, roundId: string, providerId: string): ProviderKey {
    return `${sessionId ?? 'null'}:${roundId}:${providerId}`;
  }

  enqueue(sessionId: string | null, roundId: string, providerId: string, deltaText: string, meta?: EnqueuePayloadMeta) {
    const k = this.key(sessionId, roundId, providerId);
    const st = this.ensure(k);
    if (st.completed) return; // ignore after completion
    st.queue.push(deltaText || '');
    st.pendingCount = st.queue.length;
    if (meta) st.meta = { ...(st.meta || {}), ...meta };
    // backpressure
    if (st.pendingCount > this.opts.backpressureMaxPending) {
      st.paused = true;
    }
    this.markDirty(k);
  }

  markCompleted(sessionId: string | null, roundId: string, providerId: string) {
    const k = this.key(sessionId, roundId, providerId);
    const st = this.ensure(k);
    st.completed = true;
    // Ensure we flush any remaining tail/queue fully into committed
    // Move all queued into tail first so the flush cycle can commit
    while (st.queue.length > 0) {
      const chunk = st.queue.shift() as string;
      st.tailText += chunk;
    }
    st.pendingCount = 0;
    st.paused = false; // do not keep paused once completed
    this.markDirty(k, true);
  }

  resume(sessionId: string | null, roundId: string, providerId: string) {
    const k = this.key(sessionId, roundId, providerId);
    const st = this.ensure(k);
    st.paused = false;
    this.markDirty(k);
  }

  clearForSession(sessionId: string) {
    // Remove all entries for a session
    const prefix = `${sessionId}:`;
    Array.from(this.states.keys()).forEach((k) => {
      if (k.startsWith(prefix)) {
        this.states.delete(k);
        this.dirtyKeys.delete(k);
      }
    });
  }

  private ensure(key: ProviderKey): InternalState {
    let st = this.states.get(key);
    if (!st) {
      st = {
        committedText: '',
        tailText: '',
        queue: [],
        lastCommitAt: Date.now(),
        paused: false,
        pendingCount: 0,
        meta: undefined,
        completed: false,
      };
      this.states.set(key, st);
    }
    return st;
  }

  private markDirty(key: ProviderKey, forceRaf?: boolean) {
    this.dirtyKeys.add(key);
    if (this.rafId == null || forceRaf) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private shouldCommitNow(st: InternalState): boolean {
    const now = Date.now();
    const since = now - st.lastCommitAt;
    if (st.tailText.length >= this.opts.tailCommitCharThreshold) return true;
    if (since >= this.opts.commitIntervalMaxMs) return true;
    // sentence boundary heuristic
    const t = st.tailText;
    if (t.length > 0 && /[\.!?\n]\s*$/.test(t)) {
      if (since >= this.opts.commitIntervalMinMs) return true;
    }
    return false;
  }

  private apply(key: ProviderKey, st: InternalState, isFinal?: boolean) {
    const snapshot: SchedulerSnapshot = {
      committedText: st.committedText,
      tailText: st.tailText,
      pendingCount: st.pendingCount,
      paused: st.paused,
      meta: st.meta,
      isFinal: isFinal || false,
    };
    this.opts.onApply(key, snapshot);
  }

  private flush() {
    this.rafId = null;
    if (this.dirtyKeys.size === 0) return;

    const keys = Array.from(this.dirtyKeys);
    this.dirtyKeys.clear();

    const budget = Math.max(1, this.opts.maxUpdatesPerFrame);
    let processed = 0;

    for (let i = 0; i < keys.length && processed < budget; i++) {
      const key = keys[i];
      const st = this.states.get(key);
      if (!st) continue;

      // If paused due to backpressure, do not ingest new queue chunks
      if (!st.paused) {
        // drain queue into tail
        while (st.queue.length > 0) {
          const chunk = st.queue.shift() as string;
          st.tailText += chunk;
        }
        st.pendingCount = st.queue.length;
      }

      const commitNow = this.shouldCommitNow(st) || st.completed;
      if (commitNow) {
        // move all tail into committed
        if (st.tailText.length > 0) {
          st.committedText += st.tailText;
          st.tailText = '';
          st.lastCommitAt = Date.now();
        }
      }

      processed++;
      this.apply(key, st, st.completed);

      // If still pending or paused and not completed, schedule another frame
      if ((st.queue.length > 0 && !st.paused) || st.tailText.length > 0 || (!st.completed && this.dirtyKeys.size > 0)) {
        // keep RAF alive
        if (this.rafId == null) {
          this.rafId = requestAnimationFrame(() => this.flush());
        }
      }
    }

    // If there are remaining dirty keys not processed due to budget, schedule another RAF
    if (this.dirtyKeys.size > 0) {
      if (this.rafId == null) {
        this.rafId = requestAnimationFrame(() => this.flush());
      }
    }
  }
}

export default StreamingScheduler;
