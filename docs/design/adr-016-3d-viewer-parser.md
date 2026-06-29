# ADR-016: 3D Model Viewer and Parser

**Status:** Accepted  
**Date:** 2026-06-29  
**Scope:** Phase 1B — Files / Viewer / Analysis

---

## Context

Phase 1B must allow buyers to preview uploaded 3D models in the browser before configuring a print job. The viewer must render STL, OBJ, and 3MF files, display bounding dimensions in millimetres, permit rotate/zoom/reset interaction, work on mobile browsers, and never expose the raw private object URL.

## Options Evaluated

| Option                  | Licence    | Bundle (gzip)   | Mobile | Notes                                                                    |
| ----------------------- | ---------- | --------------- | ------ | ------------------------------------------------------------------------ |
| Three.js (r152+)        | MIT        | ~150 kB minimal | ✅     | Best ecosystem, tree-shakable. Needs dynamic import to avoid SSR issues. |
| @google/model-viewer    | Apache 2.0 | ~120 kB         | ✅     | Web component, easy drop-in, built-in AR. Limited programmatic control.  |
| Babylon.js              | Apache 2.0 | ~250 kB         | ✅     | Full engine, overkill for preview.                                       |
| Pure Canvas 2D (custom) | —          | 0 kB (bundled)  | ✅     | No dependency, minimal bundle. Limited to wireframe + flat shading.      |

All options support STL, OBJ, and 3MF through community loaders (Three.js addon loaders add ~30 kB).

## Decision

**Phase 1B** uses a **pure Canvas 2D viewer** custom-built for STL files, with the parser reading binary and ASCII STL on the client side. This eliminates an import-heavy dependency, keeps the initial page load under budget, and provides functional rotate/zoom/reset for the primary file format.

**Phase 1C or 2A** should migrate to Three.js or model-viewer for IMesh material rendering, OBJ/3MF support with textures, AR preview, and lower-end device fallback.

## Consequences

- Positive: No new dependency. The preview component is a single TSX file + a geometry parser. Dimension calculation is built in.
- Negative: OBJ/3MF support is deferred to the migration, during which the loader adapters inside `ModelPreview` can be swapped without changing the component interface.
- Risk: Canvas 2D rendering does not produce a shaded 3D surface look. The initial UX communicates "technical preview, not final result". The UI guide (08-ui-guide.md §Upload/analysis) already expects a "3D viewer + textual dimensions" approach.

## Resource limits

- Meshes exceeding 300 000 triangles are rejected client-side with a warning.
- The viewer caps rendering to 60 fps via `requestAnimationFrame`.
- No parser or renderer executes on the server (SSR returns a placeholder).

## Private URL protection

- The component never receives a direct `src` URL to the private asset. Instead it accepts a safe derived payload (`facets: number[][]`, `bounds: number[]`) generated server-side or computed from the user's uploaded file object in memory before the private URL is issued.
- No signed URL or storage key crosses into the preview component.

## Unit ambiguity

- STL files do not encode units. The viewer displays computed millimetres assuming 1 unit = 1 mm.
- When the source unit is ambiguous (OBJ with no `unit` declaration, or a user override), a confirmation prompt appears before the dimensions are used in a quote/request.
- The confirmed scale is stored as a separate input field, not written back to the source file.
