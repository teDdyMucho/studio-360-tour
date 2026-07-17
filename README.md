# 360° Virtual Tour — 3D Walkthrough (Matterport-style)

Isang-page na 360° virtual walkthrough. **Walang login.** Drag para tumingin sa
paligid, scroll para mag-zoom, at pindutin ang mga kumikinang na tuldok o ang
floorplan para lumipat sa ibang kwarto — may smooth crossfade transition.

Gawa sa **React + Vite + react-three-fiber (Three.js)**.

---

## Paano patakbuhin (local)

```bash
npm install          # isang beses lang
npm run dev          # buksan ang link na lalabas, hal. http://localhost:5173
```

## Paano i-build para i-host

```bash
npm run build        # gagawa ng /dist folder (static files)
npm run preview      # para i-preview ang production build
```

I-upload lang ang laman ng `dist/` sa kahit anong static host (Vercel, Netlify,
GitHub Pages, cPanel, atbp). Walang server na kailangan.

---

## Kontrol
| Galaw | Aksyon |
|------|--------|
| Drag (mouse / hawak) | Tumingin 360° |
| Scroll / pinch | Zoom in/out |
| Click sa glowing dot | Lumipat sa ibang kwarto |
| Click sa floorplan dot | Direktang tumalon sa scan point |
| ⟳ button | Auto-rotate on/off |
| ⛶ button | Fullscreen |
| Pindutin ang **P** | Ipakita ang kasalukuyang yaw/pitch (para sa pag-aim ng hotspot) |

---

## Paano magdagdag / magpalit ng panorama

1. Ilagay ang **360° equirectangular** na image sa `public/images/`
   (hal. `pano-bathroom.jpg`).
2. Buksan ang `src/tour.config.js` at magdagdag ng scene, o palitan ang `panorama`
   path ng existing scene.

```js
{
  id: 'bathroom',
  name: 'Bathroom',
  panorama: './images/pano-bathroom.jpg',
  initialYaw: 0,                 // saan nakaharap pagbukas
  map: { x: 40, y: 30 },         // posisyon sa floorplan (percent 0-100)
  hotspots: [
    { target: 'living', yaw: 180, pitch: -25, label: 'Living' },
  ],
}
```

## Paano i-aim ang mga hotspot (tuldok sa sahig)
1. Patakbuhin (`npm run dev`), pumunta sa scene.
2. I-drag ang view papunta sa direksyon kung saan mo gustong ilagay ang tuldok
   (halimbawa, tingnan ang pintuan papuntang kabilang kwarto).
3. Pindutin ang **P** → lalabas sa itaas ang `yaw` at `pitch`.
4. Kopyahin ang mga numerong iyon sa hotspot ng scene sa `tour.config.js`.
   - `pitch` = gawing negatibo (hal. `-25`) para nasa sahig ang tuldok.

## Palitan ang pamagat
Nasa taas ng `src/tour.config.js`:
```js
export const tourInfo = { title: 'Studio Apartment', subtitle: '360° Virtual Walkthrough' }
```

---

## Kasalukuyang laman
3 scan points (galing sa binigay mong panorama + floorplan):
- **Living & Dining** — `public/images/pano-living.jpg`
- **Bedroom** — `public/images/pano-bedroom.jpg`
- **Kitchen** — `public/images/pano-kitchen.jpg`
- Floorplan — `public/images/floorplan.jpg`

> Ang yaw/pitch ng mga hotspot ay naka-set na sa magandang default, pero puwede mong
> i-fine-tune gamit ang **P** trick sa itaas para tumpak na tumapat sa mga pinto.
