# Futures Calc — PWA

## Project Overview

A mobile-first Progressive Web App for futures traders. Three pages:
- **index.html** — Position sizing calculator ("Futures Calc")
- **journal.html** — Trade journal with P&L calendar, charts, news, and daily checklist
- **notes.html** — Trading notes (pre-market analysis, trade logs, post-session reviews)

No build tools. Pure HTML + embedded CSS + vanilla JS. All three files are self-contained.

---

## File Structure

```
TradingCalc/
├── index.html          # Calculator page
├── journal.html        # Trade journal page (~2500 lines)
├── notes.html          # Trading notes page (~1050 lines)
├── manifest.json       # PWA install metadata
├── sw.js               # Service worker (cache-first)
├── icon.svg            # App icon (teal chart line on navy square)
├── proxy-worker.js     # Cloudflare Worker source for CORS proxy
├── wrangler-proxy.toml # Wrangler config for CF Worker deployment
└── serve.py            # Local dev server
```

---

## PWA Setup

### Service Worker (`sw.js`)
- Cache name: bump the version string (e.g. `'20260419b'`) on every deploy to force cache invalidation
- Strategy: cache-first — serves from cache, falls back to network
- Cached assets: `./`, `index.html`, `journal.html`, `notes.html`, `manifest.json`, `icon.svg`, Chart.js CDN
- `skipWaiting()` + `clients.claim()` are set so new SW activates immediately on next open
- **To force update**: bump cache name string, redeploy. Users see new version on next app open.

### manifest.json
- `name`: "Futures Calc", `short_name`: "Futures Calc"
- `display`: standalone, `orientation`: portrait-primary
- `theme_color`: `#0f3460`, `background_color`: `#0d0d0d`
- Icon: SVG only (`purpose: "any maskable"`)

### iOS PWA
- `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` meta tags on all pages
- All inputs/selects/textareas have `font-size: 16px !important` globally to prevent iOS auto-zoom on focus
- `min-height: 100dvh` and `padding-bottom: env(safe-area-inset-bottom)` for notch/home bar

---

## Design System

### CSS Variables (shared across all pages)
```css
--bg:       #e8e8e8   /* page background (light grey) */
--card:     #1a1a2e   /* card/modal background (dark navy) */
--border:   #2a2a4a   /* borders */
--accent:   #0f3460   /* header background */
--buy:      #00d4aa   /* teal — buy/positive/active */
--sell:     #e94560   /* red — sell/negative/loss */
--warn:     #f5a623   /* amber — warnings/max loss */
--text:     #e0e0e0   /* primary text */
--text-dim: #888      /* secondary/muted text */
--input-bg: #0d1117   /* input field background */
--radius:   12px      /* card border radius */
```

### Typography
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Monospace (prices/numbers): `"SF Mono", "Fira Code", monospace`

### Header Pattern (all pages)
```html
<header>
  <svg><!-- logo: teal chart line on navy rounded square --></svg>
  <h1>Page Title</h1>
  <!-- right side: action buttons -->
</header>
```
- Header: `background: var(--accent)`, `padding: 14px 16px`, sticky top
- Logo SVG: `width: 28px; height: 28px`

### Segmented Button Controls
Two variants used across journal.html and notes.html:
- `.jn-seg-group` / `.jn-seg-btn` (journal Add Note modal)
- `.seg-group` / `.seg-btn` (notes.html modal)

Active state: `background: var(--buy); color: #000`
Active-negative (Short in Trend/Direction): `background: var(--sell); color: #fff` via `.active-neg`

### Modals
- Overlay: `position: fixed; inset: 0; background: rgba(0,0,0,.65); align-items: flex-start; overflow-y: auto`
- Modal anchors to top of viewport (not center)
- `.modal-overlay.open { display: flex; }`

---

## localStorage Keys

| Key | Page | Contents |
|-----|------|----------|
| `jrnl_trades_v1` | journal | All imported trades (array of trade objects) |
| `jrnl_balances_v1` | journal | Account balance overrides (object keyed by account) |
| `jrnl_trading_notes_v1` | journal + notes | Trading notes array (shared between both pages) |
| `jrnl_routine_v1` | journal | Daily Routine checklist text (newline-separated) |
| `jrnl_rules_v1` | journal | Daily Rules text (bullet list) |
| `jrnl_routine_checks_v1` | journal | Checkbox state for today's routine (`{ date, checks }`) |
| `jrnl_av_news_v1` | journal | Cached Alpha Vantage news feed (`{ date, articles, time }`) |
| `jrnl_lock_notes_v1` | journal | Login/credentials note (plain text) |
| `monthlyGoal` | index + journal | Monthly profit goal (number, default 1250) |
| `copyTrading` | index | Copy trading accounts count (number) |

---

## index.html — Calculator

### Inputs
| Field | ID | Notes |
|-------|----|-------|
| ATR | `micros` | Tick/point value per contract |
| Risk | `riskDisplay` | Readonly = ATR × 2 |
| Direction | `btnBuy`/`btnSell` | BUY (b) / SELL (s) toggle |
| Ticker | `contract` | NQ / GC / ES |
| Entry Price | `price` | Large prominent input |
| Copy Trading Accounts | `copyTrading` | Multiplies qty/tp/sl outputs |

### Contract Multipliers
```js
const MULT = { NQ: 2, GC: 10, ES: 5 }
```

### Goal Math
```js
weekly  = Math.ceil(monthlyGoal / 3)
daily   = weekly / 3
maxLoss = weekly / 2
```

### Strategy Targets & Qty
```js
targets = [daily * 1.25, daily, daily / 2, daily / 3, daily / 4]
qty = Math.round(target / (mult * micros))
```

### TP/SL Contracts
```js
tp1 = qty === 1 ? 1 : qty - 1
sl1 = Math.round(qty / 2)
sl2 = (qty - sl1) === 0 ? '' : qty - sl1
tp2 = qty <= 1 ? '' : 1
```

### Price Levels (Buy)
```js
entry = price + micros + micros * 0.25
sl1   = price - micros
sl2   = price - micros * 2
tp2   = price + micros * 2
// Sell: all signs flipped
```

### Setups (strategy rows)
`A+ (NY AVWAP)`, `A (NY AVWAP)`, `B+ (KEY LEVEL)`, `B (KEY LEVEL)`, `SCALP`

### Hotkeys
- `b` — set BUY direction
- `s` — set SELL direction
- `e` — clear and focus price input
- `a` — focus ATR input
- `t` — focus ticker select
- `Esc` — clear strategy row focus
- `x` — blur active input

---

## journal.html — Trade Journal

### Data Model (Trade Object)
Parsed from Tradovate CSV exports. Key fields:
```js
{
  id,           // unique string
  account,      // account name string
  side,         // 'Long' | 'Short'
  symbol,       // e.g. 'MNQM6'
  boughtTS,     // ISO timestamp (entry for Long, EXIT for Short)
  soldTS,       // ISO timestamp (exit for Long, ENTRY for Short)
  qty,          // number of contracts
  pnl,          // P&L in dollars
  dateKey,      // 'YYYY-MM-DD' (used for calendar)
}
```

**SHORT trade note**: `boughtTS`/`soldTS` are flipped for short trades.
For chart rendering: `entryTS = trade.side === 'Short' ? trade.soldTS : trade.boughtTS`

### Tradovate Symbol Parsing
```js
/[FGHJKMNQUVXZ]\d{1,2}$/.test(sym)  // detect futures contract
// Append '=F' for Yahoo Finance lookup: 'MNQM6' → 'MNQM6=F'
```

### Toolbar Buttons (left → right)
| Button | ID | Icon | Function |
|--------|----|------|----------|
| Checklist | `checkBtn` | Checkmark | Daily Routine/Rules modal |
| News | `newsBtn` | Broadcast antenna | Alpha Vantage news feed |
| Notes | `monitorBtn` | Document + pencil | Navigate to notes.html |
| Logins | `lockBtn` | Lock | Editable credentials note |
| Payouts | `moneyBtn` | Dollar | Payout tracker |

### Calendar
- **Grid**: 5 columns (Mon–Fri) + Week summary column — weekends hidden
- **CSS**: `grid-template-columns: repeat(5, 1fr) 80px`
- White note dot: inline to the right of the date number (`17 •`)
  - Rendered via `.cal-note-dot` span inside `.cal-date` div
- Click a day to filter trades table to that day + show "+ Note" button
- End-of-week trigger: Friday (`dow === 5`) or last weekday of month
- Week P&L vs weekly goal: teal if met, amber/red if busted
- bfcache fix: `window.addEventListener('pageshow', e => { if (e.persisted) renderCalendar(...) })`

### Trade Charts
- Library: TradingView Lightweight Charts v4.1.3 (CDN)
- Eye toggle: hides/shows QTY and P&L columns (resets on modal close)
- Proxy: `https://yf-proxy.sagemediaco.workers.dev/proxy?url=<encoded>`
- Fallback chain: CF proxy → direct fetch → corsproxy.io → allorigins.win
- Candle interval logic by trade age:
  - ≤6 days: `1m` (recent) / `2m` (older)
  - ≤59 days: `2m` / `5m`
  - ≤729 days: `60m`
  - Older: `1d`
- Candle filtering: timestamps filtered to `[from, to]` window to prevent full-day Yahoo data
- Crosshairs hidden: `vertLine: { visible: false }`, `horzLine: { visible: false }`
- Chart config: `lastValueVisible: false`, `priceLineVisible: false`, `scaleMargins: { top: 0.08, bottom: 0.08 }`

### News Feed (Alpha Vantage)
- API key: `VKKZ65Z3HUM880TJ`
- Tickers: `QQQ,NVDA,AAPL,MSFT,AMZN,META,GOOGL,TSLA,AVGO,AMD,SPY,GLD`
- Topics: `economy_monetary,economy_macro`
- Cached in `jrnl_av_news_v1` by date (one fetch per day, 25 call/day free tier)
- Fetches AV directly first (CORS supported), proxy as fallback

### Add Note Modal (from calendar)
- Appears when a calendar day is selected — "+ Note" button in Trades card header
- Type: Pre-Market / Trade / Post-Session
- Trade-only fields (hidden for Pre-Market/Post-Session):
  - Strategy: VWAP / LEVEL / SCALP
  - Symbol: NQ / ES / GC
  - Grade: + / − (no None; "−" is NOT red — only Short in Trend/Direction is red)
  - Trend: Long / Short (Short = red `active-neg`)
  - Direction: Long / Short (Short = red `active-neg`)
- Trade template pre-fill:
  ```
  Theory:
  ATR:
  QTY:
  Entry:
  Exit:
  Drawdown:
  Hit TP1:
  Hit TP2:
  Hit TP3:
  P&L:
  TradingView Screenshot:
  ```
- Notes saved to `jrnl_trading_notes_v1`

### Daily Checklist
- **Daily Routine** (checkboxes, reset each day):
  ```
  Mark Weekly High/Low
  Mark Previous Day High/Low
  Mark Previous Day Close
  Mark Overnight High/Low
  Mark Timeframe Levels
  Set Key Levels
  Record Pre-Market Analysis Note
  ```
- **Daily Rules** (bullet list, static reference):
  ```
  • Max Daily Loss = Lock out for Day
  • (+ additional user-edited rules)
  ```
- Checkbox state stored per-date in `jrnl_routine_checks_v1`
- Both sections are user-editable and saved to localStorage

---

## notes.html — Trading Notes

### Data Model (Note Object)
```js
{
  id,          // generated: Date.now().toString(36) + random
  date,        // 'YYYY-MM-DD'
  type,        // 'Pre-Market' | 'Trade' | 'Post-Session'
  strategy,    // 'VWAP' | 'LEVEL' | 'SCALP' | 'None'
  symbol,      // 'NQ' | 'ES' | 'GC' | 'None'
  grade,       // '+' | '-' | ''
  trend,       // 'Long' | 'Short' | 'None'
  direction,   // 'Long' | 'Short' | 'None'
  content,     // free text (pre-wrap)
  createdAt,   // ISO timestamp
  updatedAt,   // ISO timestamp
}
```

### Storage
- Key: `jrnl_trading_notes_v1` (same key shared with journal.html)

### Header (right-aligned buttons, left-to-right order)
Download → Import → Clear → ← Journal

Button sizing: `width: 30px; height: 30px` fixed square, `line-height: 0`
Icon size enforced via CSS: `.hdr-icon-btn svg { width: 12px; height: 12px }`
Journal back button: `height: 30px; line-height: 30px; padding: 0 14px`

### Filter Bar
- Horizontal scroll, sticky at `top: 58px` (= header height: 14+30+14)
- Filters: All · Pre-Market · Trade · Post-Session · VWAP · LEVEL · SCALP

### Note Cards
- Type badge colors: Pre-Market = amber, Trade = teal, Post-Session = purple
- TradingView screenshot URL in content → extracted and rendered as "Open Screenshot ↗" link
- Edit + Delete buttons per card

### Export
- **CSV**: all fields, quoted, downloadable
- **Markdown**: grouped by date, formatted

### Import (Sync)
- Accepts `.csv` file
- Merges by `id` — skips duplicates, adds new
- Alert shows counts: `"Sync complete: N new note(s), M duplicate(s) skipped"`

### Clear Notes
- Confirms with count: `"Delete all N notes? This cannot be undone."`
- Clears entire `jrnl_trading_notes_v1` array

---

## External Services

### Cloudflare Worker Proxy
- **Deployed at**: `https://yf-proxy.sagemediaco.workers.dev`
- **Source**: `proxy-worker.js`
- **Wrangler config**: `wrangler-proxy.toml` (`name = "yf-proxy"`)
- **Allowed hosts**: `finance.yahoo.com`, `alphavantage.co`, `www.alphavantage.co`
- **Usage**: `GET /proxy?url=<encoded_url>`
- Health check: `GET /` returns "Yahoo Finance proxy OK"
- Adds browser-like User-Agent headers to bypass Yahoo bot detection

### Yahoo Finance API
- Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/<symbol>`
- Used for: candlestick chart data in trade chart modal

### Alpha Vantage
- Function: `NEWS_SENTIMENT`
- Free tier: 25 calls/day
- Direct fetch first (CORS supported), proxy fallback

### TradingView Lightweight Charts
- Version: 4.1.3
- CDN: `https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js`
- Config: `autoSize: true`, `requestAnimationFrame` for price scale updates

---

## Deployment

- Hosted via GitHub Pages or similar static host
- Deploy by pushing files to repo — no build step
- After any file change, bump `CACHE_NAME` in `sw.js` (e.g. `'20260419b'` → increment suffix)
- CF Worker deploy: `npx wrangler deploy --config wrangler-proxy.toml`

### Local Dev
```bash
python3 serve.py  # serves on localhost with correct MIME types
```

---

## Key Conventions

- **No build tools** — edit HTML files directly, all CSS/JS is embedded
- **No frameworks** — vanilla JS only
- **`font-size: 16px !important`** on all `input, select, textarea` globally — never remove, prevents iOS zoom
- **Modals**: always `align-items: flex-start` (top-aligned), not centered
- **Segmented controls**: Short in Trend/Direction = red (`active-neg`); Grade "−" is NOT red
- **Calendar**: Mon–Fri only (weekends hidden); week summary column on the right
- **bfcache**: `pageshow` listener in journal.html re-renders calendar dots on back-navigation from notes.html
- **SHORT trades**: `boughtTS` = exit time, `soldTS` = entry time (opposite of Long) — always use computed `entryTS`/`exitTS`
