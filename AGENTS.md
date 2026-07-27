# Design Notes

The app is called **Klados** (Greek for "branch"); the mark is a minimal
branching tree. The repository, the Pages URL, and the localStorage keys are
still `quizloom` — renaming those would break existing users' saved libraries.

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
- **Palette.** Tokens live at the top of `src/styles.css`. Every folder shares
  one low-chroma `--tint` (fills) / `--tint-ink` (text and edges) pair; it is
  kept deliberately neutral so it never collides with the green reviewed state
  or the terracotta accent.
- **Theming.** `:root[data-theme="dark"]` restates the tokens only — components
  must never hardcode a colour. Anything paper-tinted reads from `--surface`,
  `--surface-input`, `--folder-paper`, `--scrim`, `--on-solid`, `--primary-*`,
  `--invert-*`, or the `--desk-*` backdrop set. If a new component needs a
  literal colour, add a token instead.
- **Animation fill.** Use `backwards`, not `both`. A retained final keyframe
  keeps its `transform` applied, which both overrides hover transforms and
  turns the element into a containing block for `position: fixed` children —
  it has broken the quiz-card hover and the suggestion list already.
- **Texture.** `--grain` is an inline SVG noise tile reused on every raised
  surface. The desk gradient lives on a single fixed `body::before` layer.
- **Layout.** Topic shelves use `.card-grid`; a shelf holding exactly one quiz
  gets `is-single`, which lays that card out as a full-width row so the shelf
  never shows a half-empty grid.
- **Motion.** Quiet and short. `.rise` staggers via `--i`. Everything collapses
  under `prefers-reduced-motion`.
