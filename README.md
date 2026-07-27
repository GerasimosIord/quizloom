# Klados

Klados ("branch" in Greek) is a bilingual Greek/English quiz library for students who already have multiple-choice questions in plain text. Paste a quiz, organize it by course and topic, merge related quizzes, mark material as reviewed, and practice with shuffled answer choices.

Live site: https://gerasimosiord.github.io/quizloom/

## Features

- Exact text import format from the original prototype
- Greek and English UI toggle
- Local browser persistence with `localStorage`
- Course/topic grouping with rename support
- Search, reviewed/todo filters, and collapsible course sections
- Edit, move, delete, and merge quizzes; delete a whole course at once
- Edit imported questions in place: wording, choices, correct answer, explanation
- Practice mode with shuffled answers, explanations, progress, and score summary
- Retry only the questions you missed
- Last score remembered per quiz and shown in the library
- Keyboard shortcuts while practising: `A`–`D` or `1`–`4` to answer, `Enter` to continue
- Light and dark themes, following your system setting until you pick one
- JSON backup: export the whole library to a file, restore it by adding or replacing
- Warm paper interface, in light and dark: courses read as tinted manila folders, quizzes as index cards
- Downloadable `SKILL.md` prompt file for generating compatible quizzes with an LLM

## Import Format

```text
=== QUIZ: Cell Biology Basics ===

--- Q1 | Membranes ---
Which molecule is the main structural component of a cell membrane?
A) Cellulose
B) Phospholipids
C) DNA
D) Starch
CORRECT: B
EXPLANATION: Cell membranes are built primarily from a phospholipid bilayer.
```

The parser intentionally keeps the original format:

- Quiz title: `=== QUIZ: ... ===`
- Question header: `--- Q1 | Category ---`
- Answers: `A)` through `D)`
- Correct answer: `CORRECT: B`
- Explanation: `EXPLANATION: ...`

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Deploy

GitHub Pages is configured through `.github/workflows/deploy.yml`. Every push to `main` runs `npm run build:pages` and publishes the `dist` folder to Pages.
