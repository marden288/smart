# TODO - Smart Mirror realtime announcements/events

## Plan
- [ ] 1) Backend: add SSE endpoint `/api/stream` (no JWT) and keep list of connected clients.
- [ ] 2) Backend: make GET `/api/announcements` + `/api/events` public (no JWT) for mirror.
- [ ] 3) Backend: after POST `/api/announcements` and POST `/api/events`, broadcast SSE `update` event to clients.
- [ ] 4) Mirror module: create MagicMirror module that fetches announcements/events and subscribes to `/api/stream`.
- [ ] 5) Raspberry Pi `config.js`: add the new module to `modules` array.
- [ ] 6) Test: post from website and verify monitor updates automatically.

