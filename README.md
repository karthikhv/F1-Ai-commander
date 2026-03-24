# F1 AI Commander

Production-grade Formula 1 Race Intelligence Command Center UI with real-time telemetry simulation, interactive neural-network visualization, and strategy decision support.

## Highlights
- Clean 3-zone F1 layout: telemetry, neural hero, strategy decisions
- Interactive neural graph in the center panel (always visible)
- Live telemetry with sparkline micro-graphs
- Top-3 decision cards with confidence rings
- Explainability panel with feature-importance bars
- Smart risk alerts (non-intrusive)
- Race timeline with current lap, pit-window band, and events
- GPU performance mode toggle (High/Medium/Low)

## Stack
- Vite 5
- Three.js
- Vanilla JavaScript + CSS

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

## GitHub Pages Build (repo path)
This project supports path-based deploys via `BASE_PATH`.

```bash
$env:BASE_PATH='/F1-Ai-commander/'
npm run build
```

## Deployment
GitHub Actions workflow is included at `.github/workflows/deploy-pages.yml`.

After pushing to `main`, it will:
1. Install dependencies
2. Build with `BASE_PATH=/F1-Ai-commander/`
3. Deploy `dist` to GitHub Pages

Expected URL:
`https://karthikhv.github.io/F1-Ai-commander/`

## QA Checklist (Senior QA Pass)
- Neural network remains visible in center panel at all times
- No overlap between alerts and strategy cards
- Text remains crisp on high-DPI displays
- Timeline and sparkline canvases render sharply (DPR-aware)
- Layout stays usable on desktop and mobile breakpoints
- Build passes without compile/runtime errors

## Repository Structure
- `index.html` UI shell and 3-zone layout
- `src/main.js` rendering engine, UI bindings, animation loops
- `src/data.js` telemetry/intelligence simulation model
- `src/style.css` design system and responsive layout
- `.github/workflows/deploy-pages.yml` CI/CD deploy pipeline

## Push To GitHub (first time)
```bash
git init
git branch -M main
git remote add origin https://github.com/karthikhv/F1-Ai-commander.git
git add .
git commit -m "feat: production F1 AI commander UI with neural visibility and pages deploy"
git push -u origin main
```
