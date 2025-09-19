# Project Status – Personal Running Tracker

Updated: Today

This document summarizes what was fixed/implemented recently and the current behavior of the app when running under Expo Go (no native build), plus what’s ready for a native-capable Development Build.

## Recent Changes

- Git repository hygiene
  - Flattened nested repo in `PersonalRunningTracker/` (removed submodule/gitlink).
  - Added `.gitattributes` for line endings, extended `.gitignore`, and untracked local agent files.

- Build/runtime fixes
  - Fixed Unicode/backslash issues in `RunCompletionScreen.tsx` (bundle errors).
  - Cleaned mojibake text in various UI strings.

- GPS behavior (Expo Go)
  - Faster first fix: use Balanced accuracy for initial acquisition.
  - Relaxed initial accuracy threshold (accepts first coarse point to exit “Acquiring”).
  - Seed first point with `getCurrentLocation()` after starting, so UI leaves “Acquiring” sooner.
  - Explicit permission prompts: if permissions are denied or GPS off, show Alert with “Open Settings”.
  - Clear, ASCII-only status text in GPS indicator.

- Maps behavior (Expo Go)
  - Central switch `CurrentRouteMap` now tries `expo-maps` in dev builds; otherwise shows a static preview (no native modules required).
  - History thumbnails and Run Details map preview render a static route image with an orange line (`#FF6B35`).
  - Added Live Preview (SVG) in Run Details: button “Ver recorrido en vivo” animates the route with an orange polyline without native maps.

- UX polishing
  - History refreshes automatically when returning from Run Details after deletion (no ghost items).
  - Sort dropdown in History renders inline so it isn’t covered by list items.

## Current Behavior (Expo Go)

- Tracking
  - Start/Pause/Resume/Stop flows work and show acquisition state, accuracy, and errors.
  - Inside buildings the first fix can be coarse; the UI exits “Acquiring” faster and improves as points arrive.

- Maps
  - History: static image route thumbnail.
  - Run Details: static map preview + “Ver recorrido en vivo” (SVG animation).
  - Route color is orange (`#FF6B35`) across previews.

## Development Build Option (Apple Maps)

To enable native Apple Maps with zoom/gestures via `expo-maps`:

1) Install: `npm i expo-maps`
2) Prebuild: `npx expo prebuild`
3) Run iOS dev build: `npx expo run:ios`

`CurrentRouteMap` will automatically use the native map when `expo-maps` is present; otherwise, it falls back to the static preview.

Alternative implementations kept commented for future use:
- `react-native-maps` (Apple/Google) and `@rnmapbox/maps` (Mapbox/MapLibre) remain in code as optional paths, not used in Expo Go.

## Known Limitations & Notes

- Indoor GPS can be slow or imprecise. For best results, enable “Precise Location” and try near open sky.
- Expo Go does not include native map modules; static previews are used by design.
- Some older docs still mention `react-native-maps` as the active renderer; see this file for the latest behavior.

