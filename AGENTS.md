# Design Notes

The app is called **Klados** (Greek for "branch"); the mark is a bare branching
tree, drawn so its ink is centred in the viewBox rather than in the nominal
24×24 box — otherwise it hangs low beside the wordmark. The repository, the
Pages URL, and the localStorage keys are still `quizloom` — renaming those
would break existing users' saved libraries.

- Keep the app as a focused quiz tool on first load; avoid landing-page or marketing layouts.
- Preserve the warm paper palette, serif headings, rounded controls, and quiet motion from the original TSX.
- The text import grammar is a product contract. Do not change it without adding backward compatibility.
- Greek and English UI copy should stay feature-equivalent. Imported quiz content is user-authored and should not be translated automatically.

## Missed decks

Every run shuffles both the question order and each question's answer choices,
so replaying a deck never becomes a memory test for positions.

A run's wrong answers can be saved as a real deck in the library. That deck
carries `missedFrom`, the id of the quiz it came from, which keeps the model
honest:

- **One missed deck per source quiz.** Saving again after another attempt
  replaces its contents, so the deck always mirrors what is still weak instead
  of accumulating a new "Missed (3)" after every attempt.
- **Saving from a missed deck prunes it in place** — the questions you have
  since got right drop out.
- **Only offered after a full run.** A partial drill cannot know the whole
  deck's weak set, so it must never rewrite the saved one.
- **It lives beside its source**, in the same course and topic. `groupQuizzes`
  sorts a missed deck under its source's title rather than its own, so a
  closer-sorting sibling cannot wedge between them, and `updateQuiz` drags the
  deck along when the source is renamed or moved. The generated title only
  follows while it is still the generated one; a hand-renamed deck is left be.
- **Its card reads a shade deeper** (`.is-missed`), mixed toward
  `--folder-paper` rather than toward a hue so it darkens in both themes and
  cannot collide with the reviewed green — which still wins, being the later
  rule.
- **The card marks it with a symbol, not a word** — `.origin-mark`, a bare "!"
  in a tinted disc, naming the source in a bubble on hover. The bubble is faded rather than hidden so the
  label stays in the accessibility tree, and it opens downward and stays inside
  the card: upward covers the deck's own title, and anything escaping the card
  is clipped by `.folder-collapse`'s overflow.
- Saved questions are taken from the stored quiz, not the played deck, so they
  keep their authored choice order and re-shuffle on each run.
- The toolbar's pooled drill plays every missed deck at once from a throwaway
  quiz that is never written to the library — hence no recorded score and no
  save button. `inLibrary()` in `App` is what distinguishes it.

Backup restore re-keys colliding ids, so it also has to repoint `missedFrom` at
the new ids or restored missed decks come back orphaned.

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
- **Empty library.** The toolbar's import button is disabled while there are no
  quizzes; the empty state carries the live one. Two identical primary actions
  on the same screen read as a mistake. It fades back in through `.button`'s
  existing opacity transition.
