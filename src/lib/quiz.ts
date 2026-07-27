export type OptionKey = "A" | "B" | "C" | "D" | "E" | "F";

export interface QuizOption {
  key: OptionKey;
  text: string;
}

export interface QuizQuestion {
  category: string;
  question: string;
  options: QuizOption[];
  correct: OptionKey;
  explanation: string;
}

export interface QuizScore {
  correct: number;
  total: number;
  at: number;
}

export interface Quiz {
  id: string;
  title: string;
  course: string;
  topic: string;
  createdAt: number;
  done?: boolean;
  /** Result of the last full run. Partial retries do not overwrite it. */
  lastScore?: QuizScore;
  questions: QuizQuestion[];
}

export interface ParsedQuiz {
  title: string;
  questions: QuizQuestion[];
}

export const NONE = "__none__";

export function uid() {
  return (
    (typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function" &&
      crypto.randomUUID()) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export function parseQuiz(raw: string): ParsedQuiz {
  const text = (raw || "").replace(/\r/g, "");
  const titleMatch = text.match(/===\s*QUIZ:\s*(.+?)\s*===/);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const headers = [...text.matchAll(/^---\s*Q\d+\s*\|\s*(.+?)\s*---/gm)].map((m) =>
    m[1].trim(),
  );
  const blocks = text.split(/^---\s*Q\d+\s*\|.+?---\s*$/m).slice(1);

  const questions: QuizQuestion[] = [];
  blocks.forEach((block, i) => {
    const lines = block.split("\n").map((line) => line.trim());
    const opts: Partial<Record<OptionKey, string>> = {};
    let correct: OptionKey | null = null;
    let explanation = "";
    const qLines: string[] = [];

    for (const line of lines) {
      const optM = line.match(/^([A-D])\)\s*(.+)/);
      const corM = line.match(/^CORRECT:\s*([A-D])/i);
      const expM = line.match(/^EXPLANATION:\s*(.+)/i);
      if (optM) opts[optM[1] as OptionKey] = optM[2].trim();
      else if (corM) correct = corM[1].toUpperCase() as OptionKey;
      else if (expM) explanation = expM[1].trim();
      else if (line && !correct && Object.keys(opts).length === 0) qLines.push(line);
    }

    const options = (["A", "B", "C", "D"] as OptionKey[])
      .filter((key) => opts[key] != null)
      .map((key) => ({ key, text: opts[key] || "" }));

    if (qLines.length && options.length >= 2 && correct) {
      questions.push({
        category: headers[i] || "-",
        question: qLines.join(" ").trim(),
        options,
        correct,
        explanation,
      });
    }
  });

  return { title, questions };
}

export const BACKUP_APP = "quizloom";
export const BACKUP_VERSION = 1;

export function blankQuestion(): QuizQuestion {
  return {
    category: "",
    question: "",
    options: [
      { key: "A", text: "" },
      { key: "B", text: "" },
      { key: "C", text: "" },
      { key: "D", text: "" },
    ],
    correct: "A",
    explanation: "",
  };
}

export function buildBackup(quizzes: Quiz[]) {
  return JSON.stringify(
    {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      quizzes,
    },
    null,
    2,
  );
}

function cleanQuestion(raw: unknown): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const options = Array.isArray(value.options)
    ? value.options
        .map((option) => {
          if (!option || typeof option !== "object") return null;
          const item = option as Record<string, unknown>;
          if (typeof item.key !== "string" || typeof item.text !== "string") {
            return null;
          }
          return { key: item.key as OptionKey, text: item.text };
        })
        .filter((option): option is QuizOption => option !== null)
    : [];

  if (typeof value.question !== "string" || options.length < 2) return null;
  if (typeof value.correct !== "string") return null;
  if (!options.some((option) => option.key === value.correct)) return null;

  return {
    category: typeof value.category === "string" ? value.category : "",
    question: value.question,
    options,
    correct: value.correct as OptionKey,
    explanation: typeof value.explanation === "string" ? value.explanation : "",
  };
}

function cleanQuiz(raw: unknown): Quiz | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const questions = Array.isArray(value.questions)
    ? value.questions
        .map(cleanQuestion)
        .filter((question): question is QuizQuestion => question !== null)
    : [];

  if (!questions.length) return null;

  const score = value.lastScore as Record<string, unknown> | undefined;
  const lastScore =
    score &&
    typeof score.correct === "number" &&
    typeof score.total === "number" &&
    typeof score.at === "number"
      ? { correct: score.correct, total: score.total, at: score.at }
      : undefined;

  return {
    id: typeof value.id === "string" && value.id ? value.id : uid(),
    title: typeof value.title === "string" && value.title.trim() ? value.title : "Quiz",
    course: typeof value.course === "string" ? value.course : "",
    topic: typeof value.topic === "string" ? value.topic : "",
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    done: value.done === true,
    ...(lastScore ? { lastScore } : {}),
    questions,
  };
}

/**
 * Reads a backup file. Accepts both the exported envelope and a bare
 * `{ quizzes: [...] }` blob, so a hand-copied localStorage dump still works.
 * Throws when nothing usable is found.
 */
export function readBackup(raw: string): Quiz[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("unreadable");
  }

  const source = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).quizzes
      : null;

  if (!Array.isArray(source)) throw new Error("unreadable");

  const quizzes = source
    .map(cleanQuiz)
    .filter((quiz): quiz is Quiz => quiz !== null);

  if (!quizzes.length) throw new Error("empty");
  return quizzes;
}

export function groupQuizzes(list: Quiz[], locale: string) {
  const byCourse: Record<string, Record<string, Quiz[]>> = {};

  for (const quiz of list) {
    const course = (quiz.course || "").trim() || NONE;
    const topic = (quiz.topic || "").trim() || NONE;
    byCourse[course] = byCourse[course] || {};
    byCourse[course][topic] = byCourse[course][topic] || [];
    byCourse[course][topic].push(quiz);
  }

  const sortKeys = (arr: string[]) =>
    arr.sort((a, b) => {
      if (a === NONE) return 1;
      if (b === NONE) return -1;
      return a.localeCompare(b, locale);
    });

  return sortKeys(Object.keys(byCourse)).map((course) => ({
    course,
    topics: sortKeys(Object.keys(byCourse[course])).map((topic) => ({
      topic,
      items: byCourse[course][topic].sort((a, b) =>
        a.title.localeCompare(b.title, locale),
      ),
    })),
  }));
}

export function shuffleQuiz(quiz: Quiz): Quiz {
  const letters: OptionKey[] = ["A", "B", "C", "D", "E", "F"];

  return {
    ...quiz,
    questions: quiz.questions.map((question) => {
      const arr = question.options.map((option) => ({
        text: option.text,
        correct: option.key === question.correct,
      }));

      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      const options = arr.map((option, i) => ({ key: letters[i], text: option.text }));
      const correctIndex = arr.findIndex((option) => option.correct);

      return {
        ...question,
        options,
        correct: letters[correctIndex < 0 ? 0 : correctIndex],
      };
    }),
  };
}

export const sampleQuizText = `=== QUIZ: Βασική Βιολογία / Biology Basics ===

--- Q1 | Κύτταρο / Cell ---
Ποιο οργανίδιο παράγει το μεγαλύτερο μέρος της κυτταρικής ενέργειας;
A) Πυρήνας
B) Μιτοχόνδριο
C) Ριβόσωμα
D) Λυσόσωμα
CORRECT: B
EXPLANATION: Το μιτοχόνδριο παράγει ATP μέσω κυτταρικής αναπνοής.

--- Q2 | Genetics ---
Which molecule carries hereditary information in most organisms?
A) RNA
B) Protein
C) DNA
D) Lipid
CORRECT: C
EXPLANATION: DNA stores genetic instructions and passes them from cell to cell.

--- Q3 | Membranes ---
What is the main structural feature of the cell membrane?
A) Phospholipid bilayer
B) Cellulose wall
C) Collagen sheet
D) Starch capsule
CORRECT: A
EXPLANATION: Cell membranes are organized as phospholipid bilayers with embedded proteins.`;
