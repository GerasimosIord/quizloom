---
name: mcq-quiz-creator
description: Create high-quality multiple choice quizzes from educational materials (lectures, PDFs, presentations). Use when the user wants to create a quiz, test, or assessment based on uploaded course materials, study guides, or any educational content. Triggers on requests like "make a quiz from this lecture", "create practice questions", "help me study this material", or "generate exam questions".
---

# MCQ Quiz Creator

Generate multiple choice quiz content in a structured text format. The user pastes this output into a separate persistent quiz app — **never build a React app or artifact for the quiz itself.**

## Text Output Format

Output quiz questions in exactly this format. The quiz app parses this, so the format must be followed precisely:

```
=== QUIZ: [Quiz Title] ===

--- Q1 | [Category] ---
[Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
CORRECT: [A/B/C/D]
EXPLANATION: [1-3 sentence explanation]

--- Q2 | [Category] ---
[Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
CORRECT: [A/B/C/D]
EXPLANATION: [1-3 sentence explanation]

...
```

### Format Rules
- First line: `=== QUIZ: [title] ===`
- Each question block starts with `--- Q[n] | [Category] ---`
- Exactly 4 options labeled A) B) C) D)
- `CORRECT:` line with the letter only
- `EXPLANATION:` line with a concise explanation
- Blank line between question blocks
- Nothing else — no commentary, no markdown, no code fences around the output

## Initial Step: Language Selection

**Always ask the user whether they want the quiz in Greek or English before generating questions.** This applies regardless of the source material's language.

## Core Principles

### 1. Question Quantity
- Generate enough questions to comprehensively cover all substantive concepts in the material
- Skip filler content (discovery dates, historical trivia, tangential details)
- One concept = one question (avoid redundancy)
- Let material density dictate count — a dense pharmacology lecture needs more questions than a brief overview

### 2. Question Quality

**DO:**
- Test understanding of concepts, not trivial memorization
- Focus on relationships, processes, classifications, mechanisms, and key distinctions
- Ensure all options are plausible (no obvious wrong answers)
- Write clear, unambiguous questions
- Build distractors from **real, common misconceptions** — the specific ways students actually get this wrong (a confused mechanism, a swapped cause/effect, a plausible-but-incorrect definition). Good distractors are diagnostic: choosing one reveals a specific gap, so the quiz teaches even when answered wrong.

**DON'T:**
- Ask about specific dates/numbers unless clinically or practically critical
- Create multiple questions testing the same concept
- Make the correct option longer, more detailed, or more qualified than the distractors (see §4 — this is the most common scoring tell; equalize option length)
- Use "all of the above" or "none of the above"

**Taxonomy/Systematics exception:** For systematics, taxonomy, or classification-heavy courses, testing diagnostic characters, family-level identification, phylogenetic placement, and key morphological traits that define taxa counts as conceptual understanding — not trivial memorization. Treat these as core concepts.

### 3. Answer Position — handled at runtime
The quiz app shuffles each question's options randomly every time the student starts, so the position of the correct answer is irrelevant. **Don't spend effort balancing or randomizing which letter is correct** — write the options in whatever order is most natural and let the app handle position. Spend that attention on §4 (length parity) and on the learning value of the questions and explanations instead.

### 4. Answer Length Parity (CRITICAL — anti-gaming)

AI-generated MCQs have a strong, well-documented tell: the correct option tends to be **longer, more detailed, more qualified, or more complete** than the distractors. A test-taker who knows nothing can score far above chance simply by picking the longest/most elaborate answer. This silently destroys the assessment's value. Treat length parity as a hard requirement, not a nice-to-have.

**Rules:**
- Keep all four options within a similar length band. Aim for the longest option to be no more than ~25% longer (in words) than the shortest within the same question.
- Do NOT load the correct answer with extra qualifiers, caveats, or explanatory clauses that the distractors lack. If the correct answer genuinely needs a hedge ("…under most conditions"), give the distractors comparable phrasing.
- Match grammatical form and specificity: if the key names a mechanism with a concrete detail, the distractors should also name mechanisms with concrete (but wrong) detail — not vague one-liners.
- Across the whole quiz, the longest option in each question should be the correct one **no more often than chance** (≈25%). Deliberately make some distractors the longest option.
- Avoid other length-correlated tells: the correct answer should not be the only grammatically complete one, the only one matching the stem's tense/number, or the only one without an "absolute" word (always/never/all/none) when distractors use them.

**Self-test before finalizing:** Imagine a student who hasn't studied and always picks the longest answer. If they would score above ~25%, rewrite the options to equalize length.

### 5. Language Consistency
- Generate the quiz in the language the user selected (Greek or English)
- Preserve scientific/technical terminology appropriately for the chosen language
- Maintain consistency throughout all questions and explanations

## Workflow

### Step 1: Ask Language Preference
Before analyzing material, ask: "Would you like the quiz in Greek or English?"

### Step 2: Analyze Material
1. Read the entire document to understand scope
2. Identify major topics/sections
3. Note key concepts, definitions, processes, classifications
4. Distinguish substantive content from filler

### Step 3: Draft Questions by Topic
For each concept, evaluate:
- Is this substantive knowledge worth testing?
- What angle tests understanding (not memorization)?
- Can I write 3 plausible wrong answers?

### Step 4: Review & Refine
Before finalizing:
- Remove redundant questions on same concept
- **Check answer length parity (§4): scan each question — is the correct option the longest/most detailed? If so, lengthen distractors or trim the key until they match.**
- Confirm all distractors are plausible and represent genuine misconceptions (not filler)
- Confirm each explanation actually teaches the concept, not just restates the answer
- Validate comprehensive coverage of substantive material
- (Answer position needs no checking — the app shuffles it at runtime)

### Step 5: Output
Output the quiz in the exact text format specified above. Do NOT wrap it in code fences or markdown. Just output the raw text so the user can copy-paste it directly into their quiz app.

## Offering the Quiz App

If the user doesn't already have the quiz app, offer to build it for them as a one-time React artifact. Say something like: "Would you like me to also create the quiz app that reads this format? You only need it once — after that, just paste new quiz content into it."

## Explanation Guidelines

The explanation is where most of the learning happens — invest here. Each question must include an explanation that:
- Clearly states why the correct answer is correct, reinforcing the underlying concept (not just restating the fact)
- Addresses why the most tempting distractor is wrong when a common misconception is at play — this corrects the error directly
- Remains concise — 1-3 sentences maximum
- Gives the student something to carry forward (the principle, the distinction, the rule of thumb), not just a verdict

## Question Type Guidelines

| Content Type | Question Approach |
|--------------|-------------------|
| Classifications | "X belongs to which category?" |
| Mechanisms | "How does X produce its effect?" |
| Processes | "What is the correct sequence of...?" |
| Definitions | "What does the term X refer to?" |
| Comparisons | "What distinguishes X from Y?" |
| Clinical/Practical | "In situation X, what is the appropriate...?" |

## Common Pitfalls to Avoid

1. **Over-questioning**: Cover concepts, not word count
2. **Trivia focus**: "When was X discovered?" → "What is X's mechanism?"
3. **Length tell**: Correct option longer/more detailed than distractors → equalize length so the answer can't be guessed by picking the longest (see §4)
4. **Lazy distractors**: Vague or obviously-wrong options → use real misconceptions so wrong answers are diagnostic and instructive
5. **Redundancy**: Multiple questions on same concept → consolidate to one, unless it's a major concept that benefits from testing multiple angles
6. **Filler inclusion**: Testing tangential details → focus on what matters for comprehension
