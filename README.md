# Quizloom

Quizloom is a bilingual Greek/English quiz library for students who already have multiple-choice questions in plain text. Paste a quiz, organize it by course and topic, merge related quizzes, mark material as reviewed, and practice with shuffled answer choices.

## Features

- Exact text import format from the original prototype
- Greek and English UI toggle
- Local browser persistence with `localStorage`
- Course/topic grouping with rename support
- Search, reviewed/todo filters, and collapsible course sections
- Edit, move, delete, and merge quizzes
- Practice mode with shuffled answers, explanations, progress, and score summary
- Warm, minimal paper-like interface
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
