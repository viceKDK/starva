# Roadmap – Personal Running Tracker

This roadmap outlines high‑value next steps and options for maps.

## Near‑Term

- Maps (Dev Build)
  - Integrate `expo-maps` for native Apple Maps in a Development Build.
  - Confirm polyline styling (keep `#FF6B35`), start/finish markers, and region fitting.

- Live Preview Enhancements (Expo Go compatible)
  - Optional full‑screen modal for the SVG animation with darker backdrop.
  - Color segments by speed (green→red) and add a simple legend.

- GPS UX
  - Add warning if accuracy stays > 50 m for > N seconds (“move to open sky”).
  - Expose a “GPS accuracy” setting in app Settings (high/balanced/low) to feed the service.

- Sharing/Export
  - Export GPX/TCX for runs; share image of the static map.

## Mid‑Term

- Offline static map caching
  - Cache static route images on device (previews load instantly in History and Details).

- Background Tracking
  - Consider background updates (with task manager) for more resilient tracking while screen is off.

- Analytics & Records
  - Split highlights: fastest km, negative splits, elevation (when available), weekly trends.

## Optional Map Paths (if not staying Expo‑only)

- `react-native-maps`
  - Works with a dev client; good for Apple/Google maps with polyline overlays.

- `@rnmapbox/maps`
  - Mapbox/MapLibre with advanced styling and tiles; needs dev client and API token if using Mapbox.

## Quality & Testing

- Unit tests for GPS service (validation/accuracy thresholds/seed behavior).
- Component tests for History/Details and the new SVG preview.
- E2E happy paths: start→pause→resume→stop→view history→details→live preview.

