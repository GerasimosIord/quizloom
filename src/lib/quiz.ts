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

export interface Quiz {
  id: string;
  title: string;
  course: string;
  topic: string;
  createdAt: number;
  done?: boolean;
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
