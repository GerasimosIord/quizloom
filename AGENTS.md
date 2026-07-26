# Design Notes

- Keep the app as a focused quiz tool on first load; avoid landing-page or marketing layouts.
- Preserve the warm paper palette, serif headings, rounded controls, and quiet motion from the original TSX.
- The text import grammar is a product contract. Do not change it without adding backward compatibility.
- Greek and English UI copy should stay feature-equivalent. Imported quiz content is user-authored and should not be translated automatically.

## Visual system

The interface is a paper study desk: a warm oat background holds tinted manila
folders (courses), and each folder holds bright index cards (quizzes).

- **Type.** Literata for display/headings, Commissioner for UI text, JetBrains
  Mono for the import textarea. All three cover Greek and Latin, so bilingual
  copy renders in the same typeface instead of falling back to a system serif.
  Do not swap in a face without Greek coverage.
- **Palette.** Tokens live at the top of `src/styles.css`. `--tint` is a
  per-course accent set inline from `courseTint()` in `App.tsx`; it colours the
  folder spine, header wash, topic labels, and card hover border. A course keeps
  its colour across sessions because the tint is hashed from the course name.
- **Texture.** `--grain` is an inline SVG noise tile reused on every raised
  surface. The desk gradient lives on a single fixed `body::before` layer.
- **Layout.** Topic shelves use `.card-grid`; a shelf holding exactly one quiz
  gets `is-single`, which lays that card out as a full-width row so the shelf
  never shows a half-empty grid.
- **Motion.** Quiet and short. `.rise` staggers via `--i`. Everything collapses
  under `prefers-reduced-motion`.
