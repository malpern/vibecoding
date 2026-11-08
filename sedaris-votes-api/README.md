# Sedaris dinner voting API

Deployed to the existing Vercel project `sedaris-votes`. Production automatically supplies the existing Blob credential. No credentials belong in this repository.

- `/api/votes`: original round, unchanged; Blob prefix `votes/`.
- `/api/votes-round2`: second round; Blob prefix `votes-round2/`; Wako is excluded.

The GitHub Pages clients live in `sedaris-dinner/` and `sedaris-dinner-take-2/`. They use separate browser preference keys and API routes.
