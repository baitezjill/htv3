Dev-ready checklist – **cosmetic only**, no new logic.

Cross out what you already have; the rest is **copy-paste CSS / 5-line TS**.

---

### 1. Message Bubbles (turn-based cards)
- [ ] User bubbles: , gradient `bg-gradient-to-br from-blue-500 to-indigo-600`, rounded-2xl  
- [ ] AI bubbles: , `bg-slate-800/60 border border-slate-700`, rounded-2xl  
- [ ] **Markdown inline** – install `react-markdown` + `remark-gfm` (already in package.json?)  
make sure they format correctly and clearly
---

### 2. Copy Button
- [ change the current copy block to onlt appear when hovering the block, leave copy all visibility the same.

### 3. Streaming Dots (CSS only)
-add
  .streaming-dots::after {
    content: "● ● ●";
    animation: pulse 1.2s infinite;
    @apply text-purple-400 tracking-widest text-xs;
  }
  ```
- [ ] While `isStreaming` → render `<span className="streaming-dots" />` inside the **last** AI bubble.

---

### 4. Provider Pill (bottom-right of AI bubble)
- [ ] Component `ProviderPill.tsx`:
  ```tsx
  export const ProviderPill = ({ id }: { id: 'chatgpt' | 'claude' | 'gemini' }) => {
    const cfg = { chatgpt: { emoji: '🟢', name: 'ChatGPT' }, claude: { emoji: '🟠', name: 'Claude' }, gemini: { emoji: '🔵', name: 'Gemini' } };
    return <span className="absolute bottom-1 right-2 text-[10px] bg-slate-900/50 px-1.5 py-0.5 rounded">{cfg[id].emoji} {cfg[id].name}</span>;
  };
  ```
- [ ] Position wrapper: `relative` on AI bubble, then `<ProviderPill id={turn.providerId} />`

---

### 5. Smooth Auto-Scroll
- [ ] Hook (you probably have it):
  ```ts
  useEffect(() => {
    if (isTyping) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [isTyping]);
  ```

---

### 6. Dark-Mode Palette (Tailwind only)
- [ ] Replace any custom colours with:
  - background: `bg-slate-900`
  - card/bubble: `bg-slate-800`
  - borders: `border-slate-700`
  - text primary: `text-slate-100`
  - text secondary: `text-slate-400`

---

### 7. “Saved” Check-Mark (2 lines)
- [ ] Inside send handler:
  ```ts
  setSaved(true);
  setTimeout(() => setSaved(false), 600);
  ```
- [ ] Button:
  ```tsx
  <button>{saved ? '✓' : 'Send'}</button>
  ```