# Market Intelligence Engine — Frontend Design System
**Last updated:** March 21, 2026 | **Version:** 1.0

---

## 1. Color Tokens (CSS Variables)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0a0a` | Global page background |
| `--surface` | `#121212` | Card/panel backgrounds (`bg-bg-surface`) |
| `--border` | `#222222` | Card borders (`border-border-main`) |
| `--text` | `#9ca3af` | Body text, labels (`text-text-muted`) |
| `--text-h` | `#f3f4f6` | Headings, bold values (`text-text-bold`) |
| `--accent` | `#50ffa7` | Primary brand accent (green glow) |
| `--success` | `#10b981` | Positive P&L, bullish signals |
| `--danger` | `#e13451` | Negative P&L, bearish signals |
| `--info` | `#818cf8` | Neutral info, context cues |
| `--secondary` | `#38bdf8` | Secondary highlights |

### Semantic Color Application
- **Red dots** (`bg-danger`): Bearish / downtrend / loss signals
- **Amber dots** (`bg-amber-500`): Warning / risk / caution / volatility
- **Green dots** (`bg-success`): Bullish / breakout / opportunity
- **Blue dots** (`bg-info`): Neutral context / informational

---

## 2. Typography

**Font family:** `'Noto Sans', system-ui, sans-serif` (imported via Google Fonts)

### Weight Scale
| Weight | Class | Usage |
|---|---|---|
| 900 | `font-black` | Page titles, stat values, ticker names, section headers, decision chips |
| 700 | `font-bold` | Labels, sub-headers, metadata keys, stat labels |
| 500 | `font-medium` | Body text, bullet reasons, recommendations |

> Never use `font-semibold` (600), `font-light` (300), or `font-thin` (100). These feel inconsistent.

### Size Scale
| Size | Usage |
|---|---|
| `text-3xl` / `text-4xl` | Page titles ("Actionable Insights", "Portfolio") |
| `text-2xl` | Section headers ("Portfolio Summary") |
| `text-xl` | Card ticker names |
| `text-sm` (14px) | Stat values, body text |
| `text-[13px]` | Recommendation body, market context bullets |
| `text-xs` (12px) | Metadata labels, company name subtitles |
| `text-[10px]` | Section labels (uppercase, `tracking-[0.15em]`), footer metadata |
| `text-[9px]` | Micro-labels (stat grid headers), tag badges |

---

## 3. Card Component Pattern

### Card Classes
- Background: `bg-bg-surface`
- Border: `border border-border-main`
- Left accent: `border-l-[3px] border-l-{danger|success|amber-500}`
- Radius: `rounded-xl`
- Hover: `hover:border-[#333]`
- Transition: `transition-all duration-200`

### Stat Grid
- Layout: `grid grid-cols-4 gap-3`
- Cell: `bg-white/[0.03] rounded-lg px-3 py-2`
- Label: `text-[9px] text-text-muted uppercase tracking-widest font-bold`
- Value: `text-sm font-black text-text-bold`

---

## 4. Summary/Stats Panel Pattern

- Background: `bg-bg-surface border border-border-main rounded-xl p-5`
- Label: `text-xs text-text-muted font-bold uppercase tracking-widest`
- Value: `text-sm font-black text-text-bold`
- Layout: `flex justify-between items-center`

---

## 5. Section Header Pattern (with icon)

```tsx
<div className="flex items-center gap-1.5 mb-2">
  <IconComponent size={12} className="text-text-muted" />
  <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
    SECTION LABEL
  </span>
</div>
```

---

## 6. Table Pattern

- Container: `bg-bg-surface border border-border-main rounded-xl overflow-hidden`
- Header: `bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold`
- Body cells: `text-sm font-bold text-text-bold` (values), `font-black` (primary column)
- Hover row: `hover:bg-white/[0.04]`
- Dividers: `divide-y divide-white/5`

---

## 7. Page Layout Pattern

- Title: `text-3xl font-black text-text-bold tracking-tighter`
- Subtitle: `text-text-muted text-base font-medium`
- Content: `max-w-5xl mx-auto` or `max-w-6xl mx-auto`

---

## 8. Animation Conventions

- Page entry: `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`
- Card entry: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`
- Duration: `0.3s`
- Ease: `"easeOut"`
- GSAP: Only for table row staggers (`stagger: 0.04`)
