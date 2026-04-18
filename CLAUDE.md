# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run deploy    # Build and publish to GitHub Pages (gh-pages -d dist)
```

No test runner or linter is configured.

## Architecture

Single-page React app for analyzing rental property investment returns. The entire application lives in two files:

- **`cashflow.jsx`** (root) — the whole app: `InputGroup` presentational component + `App` default export with all state, calculation logic, and UI. Imported by `src/main.jsx`.
- **`src/main.jsx`** — React root mount point only; imports `../cashflow.jsx`.

### Data flow inside `App`

1. All user inputs are a single flat `inputs` state object (numbers + empty strings for cleared fields).
2. `handleInputChange` parses floats, allowing `''` as a valid intermediate state. `getVal()` coerces `''`/`NaN` to `0` before math.
3. `results` is a `useMemo` that recomputes the full financial model whenever `inputs` changes — mortgage amortization (standard P&I formula), NOI, cash flow, cap rate, CoC return, and a `breakdown` sub-object used by the visualization.
4. The expense bar chart uses `hoveredBarId` state to highlight/dim segments on hover. Segments with `value <= 0` are filtered out before rendering.

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no separate `tailwind.config.js` — configuration is handled in `src/index.css`). The app uses the indigo/slate/emerald/rose palette consistently: positive cash flow → emerald, negative → rose, indigo for financing/principal.

### Deployment

Deploys to GitHub Pages under the `/cashflow/` base path (set in `vite.config.js`). The `dist/` directory is published; it is gitignored except for its contents after build.
