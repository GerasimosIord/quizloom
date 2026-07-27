import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit3,
  FileText,
  Languages,
  Layers,
  ListChecks,
  Merge,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  Sun,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  NONE,
  type OptionKey,
  type Quiz,
  type QuizQuestion,
  type QuizScore,
  blankQuestion,
  buildBackup,
  groupQuizzes,
  parseQuiz,
  readBackup,
  sampleQuizText,
  shuffleQuiz,
  uid,
} from "./lib/quiz";

type Lang = "el" | "en";
type Theme = "light" | "dark";
type View = "library" | "import" | "play" | "questions";
type DoneFilter = "all" | "todo" | "done";

const LIB_KEY = "quizmgr:library:v2";
const LANG_KEY = "quizmgr:language:v1";
const THEME_KEY = "quizmgr:theme:v1";

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/**
 * Cross-fades the whole page when swapping views. Falls back to a plain state
 * update where the View Transition API is unavailable or motion is reduced.
 */
function withViewTransition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };

  if (typeof doc.startViewTransition !== "function" || prefersReducedMotion()) {
    update();
    return;
  }

  doc.startViewTransition(() => flushSync(update));
}

/** Counts a number up on mount, for the result ring. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return value;
}

const COPY = {
  el: {
    langLabel: "Γλώσσα",
    loading: "Φόρτωση βιβλιοθήκης...",
    appKicker: "Quiz Library",
    title: "Just Learn It",
    noCourse: "Χωρίς μάθημα",
    general: "Γενικά",
    quizSingular: "quiz",
    quizPlural: "quiz",
    questionSingular: "ερώτηση",
    questionPlural: "ερωτήσεις",
    reviewed: "ελεγμένα",
    reviewedOne: "ελεγμένο",
    persistentWarning:
      "η μόνιμη αποθήκευση δεν είναι διαθέσιμη εδώ (μόνο για αυτή τη συνεδρία)",
    importQuiz: "Εισαγωγή quiz",
    merge: "Συγχώνευση",
    cancelMerge: "Άκυρο συγχώνευσης",
    search: "Αναζήτηση...",
    filters: {
      all: "Όλα",
      todo: "Για επανάληψη",
      done: "Ελεγμένα",
    },
    showing: (n: number, total: number) => `${n} από ${total}`,
    emptyTitle: "Άδεια βιβλιοθήκη",
    emptyBody:
      "Κάνε εισαγωγή του πρώτου σου quiz. Ο τίτλος, οι ερωτήσεις, οι σωστές απαντήσεις και οι εξηγήσεις διαβάζονται από το ίδιο κείμενο.",
    loadSample: "Δοκιμαστικό quiz",
    skillFile: "SKILL.md",
    downloadSkillTitle: "Skill δημιουργίας quiz",
    downloadSkillHint:
      "Δώσε αυτό το αρχείο στο LLM που προτιμάς για να σου φτιάχνει quiz στην ακριβή μορφή εισαγωγής.",
    downloadSkill: "Λήψη SKILL.md",
    emptyTodo: "Όλα τα quiz είναι ελεγμένα.",
    emptyDone: "Δεν έχεις σημειώσει κανένα quiz ως ελεγμένο ακόμα.",
    emptySearch: "Κανένα quiz δεν ταιριάζει στην αναζήτηση.",
    selectedNone: "Επίλεξε 2 ή περισσότερα quiz",
    selectedCount: (n: number) => `${n} επιλεγμένα`,
    next: "Συνέχεια",
    editQuiz: "Επεξεργασία quiz",
    deleteQuiz: "Διαγραφή quiz",
    deleteCourse: "Διαγραφή μαθήματος",
    deleteCoursePrompt: (label: string, n: number) =>
      `Να διαγραφεί το μάθημα ${label} μαζί με ${n} ${
        n === 1 ? "quiz" : "quiz"
      }; Η ενέργεια δεν αναιρείται.`,
    courseDeleted: "Το μάθημα διαγράφηκε",
    deletePrompt: (label: string) =>
      `Σίγουρα θέλεις να διαγράψεις ${label}; Η ενέργεια δεν αναιρείται.`,
    delete: "Διαγραφή",
    cancel: "Άκυρο",
    close: "Κλείσιμο",
    collapseSection: "Σύμπτυξη",
    expandSection: "Ανάπτυξη",
    save: "Αποθήκευση",
    saved: "Αποθηκεύτηκε",
    quizSaved: "Το quiz αποθηκεύτηκε",
    sampleSaved: "Προστέθηκε δοκιμαστικό quiz",
    deleted: "Διαγράφηκε",
    mergedCreated: "Δημιουργήθηκε το συγχωνευμένο quiz",
    courseRenamed: "Το μάθημα μετονομάστηκε",
    topicRenamed: "Η θεματική μετονομάστηκε",
    renameCourse: "Μετονομασία μαθήματος",
    renameTopic: "Μετονομασία θεματικής",
    newCourseName: "Νέο όνομα μαθήματος",
    newTopicName: "Νέο όνομα θεματικής",
    coursePlaceholder: "π.χ. Φυσιολογία",
    topicPlaceholder: "π.χ. Νευρικό σύστημα",
    titleLabel: "Τίτλος",
    courseLabel: "Μάθημα",
    optionalCourseLabel: "Μάθημα (προαιρετικό)",
    topicLabel: "Θεματική",
    optionalTopicLabel: "Θεματική (προαιρετικό)",
    quizContent: "Περιεχόμενο quiz",
    importTitle: "Εισαγωγή quiz",
    importSubtitle:
      "Επικόλλησε το κείμενο στην ίδια μορφή. Ο τίτλος ανιχνεύεται αυτόματα και μπορείς να τον αλλάξεις.",
    importStatusFound: (n: number) =>
      `Εντοπίστηκαν ${n} ${n === 1 ? "ερώτηση" : "ερωτήσεις"}`,
    importStatusMissing:
      "Δεν εντοπίστηκαν έγκυρες ερωτήσεις. Έλεγξε τη μορφή.",
    back: "Πίσω",
    library: "Βιβλιοθήκη",
    reviewReady: "Έτοιμο για επανάληψη",
    shuffleNotice:
      "Οι επιλογές κάθε ερώτησης ανακατεύονται τυχαία, ώστε η σωστή απάντηση να μη βρίσκεται σε προβλέψιμη θέση.",
    shuffleStart: "Ανακάτεψε επιλογές και ξεκίνα",
    previous: "Προηγούμενη",
    nextQuestion: "Επόμενη",
    seeResults: "Δες αποτελέσματα",
    result: "Αποτέλεσμα",
    correct: "Σωστό",
    wrong: "Λάθος",
    retry: "Ξανά",
    retryShuffle: "Ξανά με νέο ανακάτεμα",
    scoreMessage: (pct: number) =>
      pct === 100
        ? "Άψογα. Όλα σωστά."
        : pct >= 70
          ? "Πολύ καλά. Ρίξε μια ματιά σε όσα σε δυσκόλεψαν."
          : pct >= 40
            ? "Καλή αρχή. Αξίζει μια επανάληψη."
            : "Ξαναδιάβασε το υλικό και δοκίμασε ξανά.",
    mergeTitle: "Συγχώνευση quiz",
    newMergedTitle: "Τίτλος νέου quiz",
    mergedFallback: "Συγχωνευμένο quiz",
    mergePlaceholder: "π.χ. Νευροφυσιολογία - Σύνολο",
    deleteOriginals: "Διαγραφή των αρχικών μετά τη συγχώνευση",
    create: "Δημιουργία",
    editMeta:
      "Αλλάζοντας μάθημα ή θεματική μετακινείς το quiz σε άλλη ομάδα.",
    noTitlePlaceholder: "Τίτλος quiz",
    formatPlaceholder:
      "=== QUIZ: Τίτλος ===\n\n--- Q1 | Κατηγορία ---\nΕρώτηση;\nA) ...\nB) ...\nC) ...\nD) ...\nCORRECT: B\nEXPLANATION: ...",
    play: "Παίξε",
    edit: "Επεξεργασία",
    markDone: "Σήμανση ως ελεγμένο",
    markTodo: "Επαναφορά ως μη ελεγμένο",

    themeLabel: "Θέμα",
    themeLight: "Φωτεινό",
    themeDark: "Σκοτεινό",

    backup: "Αντίγραφο",
    backupTitle: "Αντίγραφο ασφαλείας",
    backupHint:
      "Τα quiz αποθηκεύονται μόνο σε αυτόν τον browser. Κατέβασε ένα αρχείο για να τα κρατήσεις ασφαλή ή να τα μεταφέρεις σε άλλη συσκευή.",
    exportFile: "Λήψη αντιγράφου",
    exportedMsg: "Το αντίγραφο κατέβηκε",
    importFile: "Επιλογή αρχείου",
    importFound: (n: number) => `Βρέθηκαν ${n} quiz στο αρχείο.`,
    importUnreadable: "Το αρχείο δεν διαβάζεται. Χρειάζεται αρχείο .json από το Quizloom.",
    importEmpty: "Το αρχείο δεν περιέχει έγκυρα quiz.",
    importAdd: "Προσθήκη στη βιβλιοθήκη",
    importReplace: "Αντικατάσταση όλων",
    importReplaceWarn: (n: number) =>
      `Θα διαγραφούν τα ${n} τρέχοντα quiz σου.`,
    importedMsg: (n: number) => `Προστέθηκαν ${n} quiz`,
    replacedMsg: (n: number) => `Η βιβλιοθήκη αντικαταστάθηκε με ${n} quiz`,

    practiceMissed: (n: number) =>
      `Εξάσκηση στα ${n} που έχασες`,
    missedDeckTitle: "Λάθος απαντήσεις",
    lastScore: "τελευταία",

    editQuestions: "Επεξεργασία ερωτήσεων",
    questionsTitle: "Ερωτήσεις",
    questionsSubtitle:
      "Διόρθωσε το κείμενο, τις επιλογές, τη σωστή απάντηση ή την εξήγηση κάθε ερώτησης.",
    questionN: (n: number) => `Ερώτηση ${n}`,
    questionText: "Ερώτηση",
    categoryLabel: "Κατηγορία",
    optionsLabel: "Επιλογές (διάλεξε τη σωστή)",
    explanationLabel: "Εξήγηση",
    addQuestion: "Νέα ερώτηση",
    removeQuestion: "Αφαίρεση ερώτησης",
    questionsSaved: "Οι ερωτήσεις αποθηκεύτηκαν",
    needOneQuestion: "Χρειάζεται τουλάχιστον μία ερώτηση με κείμενο και δύο επιλογές.",

    shortcutHint: "Συντομεύσεις: A–D ή 1–4 για απάντηση, Enter για συνέχεια.",
  },
  en: {
    langLabel: "Language",
    loading: "Loading library...",
    appKicker: "Quiz Library",
    title: "Just Learn It",
    noCourse: "No course",
    general: "General",
    quizSingular: "quiz",
    quizPlural: "quizzes",
    questionSingular: "question",
    questionPlural: "questions",
    reviewed: "reviewed",
    reviewedOne: "reviewed",
    persistentWarning:
      "persistent storage is unavailable here (this session only)",
    importQuiz: "Import quiz",
    merge: "Merge",
    cancelMerge: "Cancel merge",
    search: "Search...",
    filters: {
      all: "All",
      todo: "To review",
      done: "Reviewed",
    },
    showing: (n: number, total: number) => `${n} of ${total}`,
    emptyTitle: "Empty library",
    emptyBody:
      "Import your first quiz. The title, questions, correct answers, and explanations are read from the same text.",
    loadSample: "Sample quiz",
    skillFile: "SKILL.md",
    downloadSkillTitle: "Quiz generator skill",
    downloadSkillHint:
      "Give this file to your LLM of choice so it creates quizzes in the exact import format.",
    downloadSkill: "Download SKILL.md",
    emptyTodo: "All quizzes are reviewed.",
    emptyDone: "You have not marked any quiz as reviewed yet.",
    emptySearch: "No quiz matches your search.",
    selectedNone: "Select 2 or more quizzes",
    selectedCount: (n: number) => `${n} selected`,
    next: "Continue",
    editQuiz: "Edit quiz",
    deleteQuiz: "Delete quiz",
    deleteCourse: "Delete course",
    deleteCoursePrompt: (label: string, n: number) =>
      `Delete the course ${label} along with its ${n} ${
        n === 1 ? "quiz" : "quizzes"
      }? This cannot be undone.`,
    courseDeleted: "Course deleted",
    deletePrompt: (label: string) =>
      `Are you sure you want to delete ${label}? This cannot be undone.`,
    delete: "Delete",
    cancel: "Cancel",
    close: "Close",
    collapseSection: "Collapse",
    expandSection: "Expand",
    save: "Save",
    saved: "Saved",
    quizSaved: "Quiz saved",
    sampleSaved: "Sample quiz added",
    deleted: "Deleted",
    mergedCreated: "Merged quiz created",
    courseRenamed: "Course renamed",
    topicRenamed: "Topic renamed",
    renameCourse: "Rename course",
    renameTopic: "Rename topic",
    newCourseName: "New course name",
    newTopicName: "New topic name",
    coursePlaceholder: "e.g. Physiology",
    topicPlaceholder: "e.g. Nervous system",
    titleLabel: "Title",
    courseLabel: "Course",
    optionalCourseLabel: "Course (optional)",
    topicLabel: "Topic",
    optionalTopicLabel: "Topic (optional)",
    quizContent: "Quiz content",
    importTitle: "Import quiz",
    importSubtitle:
      "Paste text in the same format. The title is detected automatically and can be changed.",
    importStatusFound: (n: number) =>
      `Found ${n} ${n === 1 ? "question" : "questions"}`,
    importStatusMissing: "No valid questions found. Check the format.",
    back: "Back",
    library: "Library",
    reviewReady: "Ready to review",
    shuffleNotice:
      "Each question's answer choices are shuffled so the correct answer does not sit in a predictable position.",
    shuffleStart: "Shuffle choices and start",
    previous: "Previous",
    nextQuestion: "Next",
    seeResults: "See results",
    result: "Result",
    correct: "Correct",
    wrong: "Wrong",
    retry: "Retry",
    retryShuffle: "Retry with new shuffle",
    scoreMessage: (pct: number) =>
      pct === 100
        ? "Perfect. Everything was correct."
        : pct >= 70
          ? "Very good. Revisit the ones that slowed you down."
          : pct >= 40
            ? "Good start. This is worth another pass."
            : "Review the material and try again.",
    mergeTitle: "Merge quizzes",
    newMergedTitle: "New quiz title",
    mergedFallback: "Merged quiz",
    mergePlaceholder: "e.g. Neurophysiology - Complete set",
    deleteOriginals: "Delete originals after merge",
    create: "Create",
    editMeta: "Changing course or topic moves this quiz to another group.",
    noTitlePlaceholder: "Quiz title",
    formatPlaceholder:
      "=== QUIZ: Title ===\n\n--- Q1 | Category ---\nQuestion?\nA) ...\nB) ...\nC) ...\nD) ...\nCORRECT: B\nEXPLANATION: ...",
    play: "Play",
    edit: "Edit",
    markDone: "Mark as reviewed",
    markTodo: "Mark as not reviewed",

    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",

    backup: "Backup",
    backupTitle: "Backup and restore",
    backupHint:
      "Your quizzes live only in this browser. Download a file to keep them safe or move them to another device.",
    exportFile: "Download backup",
    exportedMsg: "Backup downloaded",
    importFile: "Choose file",
    importFound: (n: number) => `Found ${n} quizzes in the file.`,
    importUnreadable: "That file could not be read. It needs to be a Quizloom .json backup.",
    importEmpty: "The file contains no valid quizzes.",
    importAdd: "Add to library",
    importReplace: "Replace everything",
    importReplaceWarn: (n: number) => `This deletes your current ${n} quizzes.`,
    importedMsg: (n: number) => `Added ${n} quizzes`,
    replacedMsg: (n: number) => `Library replaced with ${n} quizzes`,

    practiceMissed: (n: number) => `Practice the ${n} you missed`,
    missedDeckTitle: "Missed questions",
    lastScore: "last",

    editQuestions: "Edit questions",
    questionsTitle: "Questions",
    questionsSubtitle:
      "Fix the wording, the choices, the correct answer, or the explanation of any question.",
    questionN: (n: number) => `Question ${n}`,
    questionText: "Question",
    categoryLabel: "Category",
    optionsLabel: "Choices (pick the correct one)",
    explanationLabel: "Explanation",
    addQuestion: "Add question",
    removeQuestion: "Remove question",
    questionsSaved: "Questions saved",
    needOneQuestion: "At least one question needs text and two choices.",

    shortcutHint: "Shortcuts: A–D or 1–4 to answer, Enter to continue.",
  },
};

type CopyText = (typeof COPY)[Lang];

export default function App() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageOK, setStorageOK] = useState(true);
  const [view, setView] = useState<View>("library");
  const [playing, setPlaying] = useState<Quiz | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [editingQuestions, setEditingQuestions] = useState<Quiz | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const copy = COPY[lang];
  const locale = lang === "el" ? "el" : "en";

  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem(LANG_KEY);
      if (storedLang === "el" || storedLang === "en") setLang(storedLang);

      const storedTheme = window.localStorage.getItem(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }

      const storedLibrary = window.localStorage.getItem(LIB_KEY);
      const library = storedLibrary ? JSON.parse(storedLibrary) : { quizzes: [] };
      setQuizzes(Array.isArray(library.quizzes) ? library.quizzes : []);
    } catch {
      setStorageOK(false);
      setQuizzes([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      setStorageOK(false);
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* theme is cosmetic; a failure here should not flag storage */
    }
  }, [theme]);

  const flash = useCallback((message: string) => {
    setToast({ text: message, key: Date.now() });
  }, []);

  const persist = useCallback(
    (next: Quiz[]) => {
      if (!storageOK) return;
      try {
        window.localStorage.setItem(LIB_KEY, JSON.stringify({ quizzes: next }));
      } catch {
        setStorageOK(false);
      }
    },
    [storageOK],
  );

  const commit = useCallback(
    (next: Quiz[], message?: string) => {
      setQuizzes(next);
      persist(next);
      if (message) flash(message);
    },
    [flash, persist],
  );

  useEffect(() => {
    if (!toast) return;
    setToastLeaving(false);
    const leave = window.setTimeout(() => setToastLeaving(true), 2100);
    const clear = window.setTimeout(() => setToast(null), 2400);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(clear);
    };
  }, [toast]);

  const allCourses = useMemo(
    () =>
      [...new Set(quizzes.map((quiz) => (quiz.course || "").trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, locale),
      ),
    [locale, quizzes],
  );

  const allTopics = useMemo(
    () =>
      [...new Set(quizzes.map((quiz) => (quiz.topic || "").trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, locale),
      ),
    [locale, quizzes],
  );

  const addQuiz = (quiz: Quiz, message: string) => commit([...quizzes, quiz], message);

  const updateQuiz = (id: string, patch: Partial<Quiz>, message?: string) =>
    commit(
      quizzes.map((quiz) => (quiz.id === id ? { ...quiz, ...patch } : quiz)),
      message,
    );

  const deleteQuizzes = (ids: string[], message: string) =>
    commit(
      quizzes.filter((quiz) => !ids.includes(quiz.id)),
      message,
    );

  const renameCourse = (oldName: string, newName: string) =>
    commit(
      quizzes.map((quiz) =>
        (quiz.course || "").trim() === oldName ? { ...quiz, course: newName } : quiz,
      ),
      copy.courseRenamed,
    );

  const renameTopic = (courseName: string, oldTopic: string, newTopic: string) =>
    commit(
      quizzes.map((quiz) => {
        const effectiveCourse = (quiz.course || "").trim() || NONE;
        const effectiveTopic = (quiz.topic || "").trim() || NONE;
        return effectiveCourse === courseName && effectiveTopic === oldTopic
          ? { ...quiz, topic: newTopic }
          : quiz;
      }),
      copy.topicRenamed,
    );

  const toggleDone = (id: string) =>
    commit(quizzes.map((quiz) => (quiz.id === id ? { ...quiz, done: !quiz.done } : quiz)));

  const recordScore = (id: string, score: QuizScore) =>
    commit(
      quizzes.map((quiz) => (quiz.id === id ? { ...quiz, lastScore: score } : quiz)),
    );

  const exportBackup = () => {
    const blob = new Blob([buildBackup(quizzes)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `klados-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flash(copy.exportedMsg);
  };

  const restoreBackup = (incoming: Quiz[], mode: "add" | "replace") => {
    if (mode === "replace") {
      commit(incoming, copy.replacedMsg(incoming.length));
      return;
    }
    /* Re-key anything that collides so an add never overwrites. */
    const taken = new Set(quizzes.map((quiz) => quiz.id));
    const added = incoming.map((quiz) =>
      taken.has(quiz.id) ? { ...quiz, id: uid() } : quiz,
    );
    commit([...quizzes, ...added], copy.importedMsg(added.length));
  };

  const loadSample = () => {
    const parsed = parseQuiz(sampleQuizText);
    addQuiz(
      {
        id: uid(),
        title: parsed.title,
        course: lang === "el" ? "Βιολογία" : "Biology",
        topic: lang === "el" ? "Επανάληψη" : "Review",
        createdAt: Date.now(),
        questions: parsed.questions,
      },
      copy.sampleSaved,
    );
  };

  if (!loaded) {
    return (
      <div className="app-shell">
        <div className="center-screen">{copy.loading}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        lang={lang}
        theme={theme}
        copy={copy}
        onChangeLang={setLang}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />

      {view === "questions" && editingQuestions ? (
        <QuestionsView
          key={editingQuestions.id}
          quiz={editingQuestions}
          copy={copy}
          onCancel={() =>
            withViewTransition(() => {
              setEditingQuestions(null);
              setView("library");
            })
          }
          onSave={(questions) =>
            withViewTransition(() => {
              updateQuiz(editingQuestions.id, { questions }, copy.questionsSaved);
              setEditingQuestions(null);
              setView("library");
            })
          }
        />
      ) : view === "play" && playing ? (
        <Player
          key={playing.id}
          quiz={playing}
          copy={copy}
          onRecordScore={recordScore}
          onExit={() =>
            withViewTransition(() => {
              setPlaying(null);
              setView("library");
            })
          }
        />
      ) : view === "import" ? (
        <ImportView
          copy={copy}
          allCourses={allCourses}
          allTopics={allTopics}
          onCancel={() => withViewTransition(() => setView("library"))}
          onSave={(quiz) =>
            withViewTransition(() => {
              addQuiz(quiz, copy.quizSaved);
              setView("library");
            })
          }
        />
      ) : (
        <Library
          quizzes={quizzes}
          allCourses={allCourses}
          allTopics={allTopics}
          copy={copy}
          locale={locale}
          storageOK={storageOK}
          onImport={() => withViewTransition(() => setView("import"))}
          onLoadSample={loadSample}
          onPlay={(quiz) =>
            withViewTransition(() => {
              setPlaying(quiz);
              setView("play");
            })
          }
          onUpdate={updateQuiz}
          onDelete={deleteQuizzes}
          onMerge={(quiz, deletedIds) => {
            const base = quizzes.filter((item) => !deletedIds.includes(item.id));
            commit([...base, quiz], copy.mergedCreated);
          }}
          onRenameCourse={renameCourse}
          onRenameTopic={renameTopic}
          onToggleDone={toggleDone}
          onExport={exportBackup}
          onRestore={restoreBackup}
          onEditQuestions={(quiz) =>
            withViewTransition(() => {
              setEditingQuestions(quiz);
              setView("questions");
            })
          }
        />
      )}

      {toast && (
        <div
          className={`toast ${toastLeaving ? "is-leaving" : ""}`}
          role="status"
          key={toast.key}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {toast.text}
        </div>
      )}
    </div>
  );
}

function TopBar({
  lang,
  theme,
  copy,
  onChangeLang,
  onToggleTheme,
}: {
  lang: Lang;
  theme: Theme;
  copy: CopyText;
  onChangeLang: (lang: Lang) => void;
  onToggleTheme: () => void;
}) {
  return (
    <div className="topbar">
      <span className="brand">
        {/* klados — Greek for "branch". */}
        <svg
          className="brand-mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 21V6" />
          <path d="M12 14.5 7.2 9.7" />
          <path d="M12 14.5 16.8 9.7" />
          <path d="M12 9.6 8.7 6.3" />
          <path d="M12 9.6 15.3 6.3" />
        </svg>
        <span>klados</span>
      </span>

      <div className="topbar-controls">
        <button
          className="theme-toggle"
          type="button"
          title={theme === "dark" ? copy.themeLight : copy.themeDark}
          aria-label={`${copy.themeLabel}: ${
            theme === "dark" ? copy.themeDark : copy.themeLight
          }`}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Sun size={16} aria-hidden="true" />
          ) : (
            <Moon size={16} aria-hidden="true" />
          )}
        </button>

        <div className="language-switch" role="group" aria-label={copy.langLabel}>
          <Languages size={14} aria-hidden="true" />
          <button
            className={lang === "el" ? "active" : ""}
            aria-pressed={lang === "el"}
            onClick={() => onChangeLang("el")}
          >
            EL
          </button>
          <button
            className={lang === "en" ? "active" : ""}
            aria-pressed={lang === "en"}
            onClick={() => onChangeLang("en")}
          >
            EN
          </button>
        </div>
      </div>
    </div>
  );
}

function Library({
  quizzes,
  allCourses,
  allTopics,
  copy,
  locale,
  storageOK,
  onImport,
  onLoadSample,
  onPlay,
  onUpdate,
  onDelete,
  onMerge,
  onRenameCourse,
  onRenameTopic,
  onToggleDone,
  onExport,
  onRestore,
  onEditQuestions,
}: {
  quizzes: Quiz[];
  allCourses: string[];
  allTopics: string[];
  copy: CopyText;
  locale: string;
  storageOK: boolean;
  onImport: () => void;
  onLoadSample: () => void;
  onPlay: (quiz: Quiz) => void;
  onUpdate: (id: string, patch: Partial<Quiz>, message?: string) => void;
  onDelete: (ids: string[], message: string) => void;
  onMerge: (quiz: Quiz, deletedIds: string[]) => void;
  onRenameCourse: (oldName: string, newName: string) => void;
  onRenameTopic: (courseName: string, oldTopic: string, newTopic: string) => void;
  onToggleDone: (id: string) => void;
  onExport: () => void;
  onRestore: (quizzes: Quiz[], mode: "add" | "replace") => void;
  onEditQuestions: (quiz: Quiz) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterDone, setFilterDone] = useState<DoneFilter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [mergeMode, setMergeMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [confirmDel, setConfirmDel] = useState<{
    ids: string[];
    label: string;
    isCourse?: boolean;
  } | null>(null);
  const [mergeCfg, setMergeCfg] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [ceremony, setCeremony] = useState<{
    sources: string[];
    title: string;
    questionCount: number;
    finish: () => void;
  } | null>(null);
  const [groupRename, setGroupRename] = useState<{
    type: "course" | "topic";
    course: string;
    topic?: string;
    value: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (filterDone === "todo" && quiz.done) return false;
      if (filterDone === "done" && !quiz.done) return false;
      if (!needle) return true;
      return [quiz.title, quiz.course, quiz.topic]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [filterDone, quizzes, search]);

  const groups = useMemo(() => groupQuizzes(filtered, locale), [filtered, locale]);
  const totalQuestions = quizzes.reduce((n, quiz) => n + quiz.questions.length, 0);
  const doneCount = quizzes.filter((quiz) => quiz.done).length;
  const donePct = quizzes.length ? Math.round((doneCount / quizzes.length) * 100) : 0;

  const toggleSelected = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
    );

  const toggleCollapse = (course: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(course)) next.delete(course);
      else next.add(course);
      return next;
    });

  const exitMerge = () => {
    setMergeMode(false);
    setSelected([]);
    setMergeCfg(false);
  };

  return (
    <main className="page">
      <header className="page-header">
        <div className="eyebrow">
          <span className="status-dot" />
          {copy.appKicker}
        </div>
        <h1>{copy.title}</h1>

        <div className="stat-strip">
          <span className="stat">
            <b>{quizzes.length}</b>
            <span>{quizzes.length === 1 ? copy.quizSingular : copy.quizPlural}</span>
          </span>
          <span className="stat">
            <b>{totalQuestions}</b>
            <span>
              {totalQuestions === 1 ? copy.questionSingular : copy.questionPlural}
            </span>
          </span>
          {quizzes.length > 0 && (
            <span className="stat-meter">
              <span className="meter-track">
                <span style={{ width: `${donePct}%` }} />
              </span>
              <span className="meter-label">
                {doneCount}/{quizzes.length} {copy.reviewed}
              </span>
            </span>
          )}
          {!storageOK && <span className="warning-meta">{copy.persistentWarning}</span>}
        </div>
      </header>

      <div className="toolbar">
        <button className="button button-primary" onClick={onImport}>
          <Plus size={18} aria-hidden="true" />
          {copy.importQuiz}
        </button>
        <button
          className={mergeMode ? "button button-accent" : "button button-ghost"}
          onClick={() => (mergeMode ? exitMerge() : setMergeMode(true))}
          disabled={quizzes.length < 2 && !mergeMode}
        >
          <Merge size={17} aria-hidden="true" />
          {mergeMode ? copy.cancelMerge : copy.merge}
        </button>
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.search}
          />
        </label>
        <button
          className="button button-ghost button-square"
          title={copy.backupTitle}
          aria-label={copy.backupTitle}
          onClick={() => setBackupOpen(true)}
        >
          <Archive size={17} aria-hidden="true" />
        </button>
      </div>

      {quizzes.length > 0 && (
        <div className="filter-row">
          <div className="segmented-control" role="group" aria-label={copy.filters.all}>
            {(["all", "todo", "done"] as DoneFilter[]).map((key) => (
              <button
                key={key}
                className={filterDone === key ? "active" : ""}
                aria-pressed={filterDone === key}
                /* No view transition here: cross-fading the whole page for a
                   list filter reads as a full refresh. */
                onClick={() => setFilterDone(key)}
              >
                {copy.filters[key]}
              </button>
            ))}
          </div>
          {filtered.length !== quizzes.length && (
            <span className="result-note">
              {copy.showing(filtered.length, quizzes.length)}
            </span>
          )}
        </div>
      )}

      {quizzes.length === 0 ? (
        <EmptyState copy={copy} onImport={onImport} onLoadSample={onLoadSample} />
      ) : filtered.length === 0 ? (
        <div className="card empty-card">
          {filterDone === "todo"
            ? copy.emptyTodo
            : filterDone === "done"
              ? copy.emptyDone
              : copy.emptySearch}
        </div>
      ) : (
        <div className="group-stack">
          {groups.map((group, groupIndex) => {
            const isCollapsed = collapsed.has(group.course);
            const courseLabel = group.course === NONE ? copy.noCourse : group.course;
            const courseCount = group.topics.reduce((n, topic) => n + topic.items.length, 0);
            const courseDone = group.topics.reduce(
              (n, topic) => n + topic.items.filter((quiz) => quiz.done).length,
              0,
            );

            return (
              <section
                className={`card folder rise ${isCollapsed ? "is-collapsed" : ""}`}
                key={group.course}
                style={{ "--i": groupIndex } as React.CSSProperties}
              >
                <div className="folder-head">
                  <button
                    className={`collapse-button ${isCollapsed ? "collapsed" : ""}`}
                    onClick={() => toggleCollapse(group.course)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${
                      isCollapsed ? copy.expandSection : copy.collapseSection
                    }: ${courseLabel}`}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  <h2 className={group.course === NONE ? "muted-heading" : ""}>
                    {courseLabel}
                  </h2>
                  <span
                    className={
                      courseDone === courseCount
                        ? "folder-tally complete"
                        : "folder-tally"
                    }
                  >
                    <Check size={12} aria-hidden="true" />
                    {courseDone}/{courseCount}
                  </span>
                  {group.course !== NONE && !mergeMode && (
                    <IconButton
                      label={`${copy.renameCourse}: ${courseLabel}`}
                      onClick={() =>
                        setGroupRename({
                          type: "course",
                          course: group.course,
                          value: group.course,
                        })
                      }
                    >
                      <Edit3 size={15} aria-hidden="true" />
                    </IconButton>
                  )}
                </div>

                {/* Always rendered so the open/close can animate; `inert`
                    keeps the collapsed content out of the tab order. */}
                <div
                  className="folder-collapse"
                  {...(isCollapsed ? { inert: "" } : {})}
                >
                  <div className="folder-body">
                    {group.topics.map((topic) => {
                      const topicLabel =
                        topic.topic === NONE ? copy.general : topic.topic;
                      return (
                        <div className="shelf" key={topic.topic}>
                          <div className="shelf-label">
                            <span />
                            <span>{topicLabel}</span>
                            {!mergeMode && (
                              <IconButton
                                label={`${copy.renameTopic}: ${topicLabel}`}
                                compact
                                onClick={() =>
                                  setGroupRename({
                                    type: "topic",
                                    course: group.course,
                                    topic: topic.topic,
                                    value: topic.topic === NONE ? "" : topic.topic,
                                  })
                                }
                              >
                                <Edit3 size={12} aria-hidden="true" />
                              </IconButton>
                            )}
                          </div>

                          <div
                            className={`card-grid ${
                              topic.items.length === 1 ? "is-single" : ""
                            }`}
                          >
                            {topic.items.map((quiz, cardIndex) => (
                              <QuizCard
                                key={quiz.id}
                                index={cardIndex}
                                quiz={quiz}
                                copy={copy}
                                mergeMode={mergeMode}
                                selected={selected.includes(quiz.id)}
                                onToggle={() => toggleSelected(quiz.id)}
                                onPlay={() => onPlay(quiz)}
                                onEdit={() => setEditing(quiz)}
                                onToggleDone={() => onToggleDone(quiz.id)}
                                locale={locale}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {mergeMode && (
        <div className="mergebar">
          <span>
            {selected.length === 0 ? copy.selectedNone : copy.selectedCount(selected.length)}
          </span>
          <div className="mergebar-actions">
            <button className="button button-dark-ghost" onClick={exitMerge}>
              <X size={16} aria-hidden="true" />
              {copy.cancel}
            </button>
            <button
              className="button button-inverse"
              disabled={selected.length < 2}
              onClick={() => setMergeCfg(true)}
            >
              {copy.next}
            </button>
          </div>
        </div>
      )}

      {backupOpen && (
        <BackupModal
          copy={copy}
          quizCount={quizzes.length}
          onClose={() => setBackupOpen(false)}
          onExport={onExport}
          onRestore={(incoming, mode) => {
            onRestore(incoming, mode);
            setBackupOpen(false);
          }}
        />
      )}

      {editing && (
        <EditModal
          quiz={editing}
          copy={copy}
          allCourses={allCourses}
          allTopics={allTopics}
          onClose={() => setEditing(null)}
          onDelete={() => {
            const target = editing;
            setEditing(null);
            setConfirmDel({ ids: [target.id], label: `"${target.title}"` });
          }}
          onEditQuestions={() => {
            const target = editing;
            setEditing(null);
            onEditQuestions(target);
          }}
          onSave={(patch) => {
            onUpdate(editing.id, patch, copy.saved);
            setEditing(null);
          }}
        />
      )}

      {confirmDel && (
        <Modal
          title={confirmDel.isCourse ? copy.deleteCourse : copy.deleteQuiz}
          copy={copy}
          onClose={() => setConfirmDel(null)}
        >
          <p className="modal-copy">
            {confirmDel.isCourse
              ? copy.deleteCoursePrompt(confirmDel.label, confirmDel.ids.length)
              : copy.deletePrompt(confirmDel.label)}
          </p>
          <div className="modal-actions">
            <button className="button button-ghost" onClick={() => setConfirmDel(null)}>
              {copy.cancel}
            </button>
            <button
              className="button button-danger"
              onClick={() => {
                onDelete(
                  confirmDel.ids,
                  confirmDel.isCourse ? copy.courseDeleted : copy.deleted,
                );
                setConfirmDel(null);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              {copy.delete}
            </button>
          </div>
        </Modal>
      )}

      {mergeCfg && (
        <MergeModal
          sources={quizzes.filter((quiz) => selected.includes(quiz.id))}
          copy={copy}
          allCourses={allCourses}
          allTopics={allTopics}
          onClose={() => setMergeCfg(false)}
          onCreate={(title, course, topic, deleteOriginals) => {
            const sources = quizzes.filter((quiz) => selected.includes(quiz.id));
            const merged: Quiz = {
              id: uid(),
              title: title.trim() || copy.mergedFallback,
              course: course.trim(),
              topic: topic.trim(),
              createdAt: Date.now(),
              questions: sources.flatMap((source) => source.questions),
            };
            const removed = deleteOriginals ? selected : [];
            const finish = () => {
              onMerge(merged, removed);
              exitMerge();
              setCeremony(null);
            };

            setMergeCfg(false);
            if (prefersReducedMotion()) {
              finish();
              return;
            }
            setCeremony({
              sources: sources.map((source) => source.title),
              title: merged.title,
              questionCount: merged.questions.length,
              finish,
            });
          }}
        />
      )}

      {ceremony && (
        <MergeCeremony
          sources={ceremony.sources}
          title={ceremony.title}
          questionCount={ceremony.questionCount}
          copy={copy}
          onDone={ceremony.finish}
        />
      )}

      {groupRename && (
        <Modal
          title={groupRename.type === "course" ? copy.renameCourse : copy.renameTopic}
          copy={copy}
          onClose={() => setGroupRename(null)}
        >
          <Field
            label={
              groupRename.type === "course" ? copy.newCourseName : copy.newTopicName
            }
          >
            <input
              className="input"
              autoFocus
              value={groupRename.value}
              onChange={(event) =>
                setGroupRename({ ...groupRename, value: event.target.value })
              }
              placeholder={
                groupRename.type === "course"
                  ? copy.coursePlaceholder
                  : copy.topicPlaceholder
              }
            />
          </Field>
          <div className="modal-actions modal-actions-split">
            {groupRename.type === "course" && (
              <button
                className="button button-danger-ghost"
                onClick={() => {
                  const ids = quizzes
                    .filter(
                      (quiz) => (quiz.course || "").trim() === groupRename.course,
                    )
                    .map((quiz) => quiz.id);
                  setGroupRename(null);
                  setConfirmDel({
                    ids,
                    label: `"${groupRename.course}"`,
                    isCourse: true,
                  });
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                {copy.deleteCourse}
              </button>
            )}
            <button className="button button-ghost" onClick={() => setGroupRename(null)}>
              {copy.cancel}
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                const value = groupRename.value.trim();
                if (groupRename.type === "course") {
                  onRenameCourse(groupRename.course, value);
                } else {
                  onRenameTopic(groupRename.course, groupRename.topic || NONE, value);
                }
                setGroupRename(null);
              }}
            >
              <Save size={16} aria-hidden="true" />
              {copy.save}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function QuizCard({
  quiz,
  index,
  copy,
  locale,
  mergeMode,
  selected,
  onToggle,
  onPlay,
  onEdit,
  onToggleDone,
}: {
  quiz: Quiz;
  index: number;
  copy: CopyText;
  locale: string;
  mergeMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onPlay: () => void;
  onEdit: () => void;
  onToggleDone: () => void;
}) {
  const done = Boolean(quiz.done);
  const questionCount = quiz.questions.length;
  const handleCardClick = mergeMode ? onToggle : onPlay;
  const score = quiz.lastScore;
  const scorePct = score?.total
    ? Math.round((score.correct / score.total) * 100)
    : null;

  return (
    <article
      className={`quiz-card rise ${selected ? "is-selected" : ""} ${
        done && !mergeMode ? "is-done" : ""
      }`}
      style={{ "--i": index } as React.CSSProperties}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="quiz-card-body">
        {mergeMode ? (
          <span className={`check-box ${selected ? "checked" : ""}`}>
            {selected && <Check size={14} aria-hidden="true" />}
          </span>
        ) : (
          <button
            className={`stamp ${done ? "checked" : ""}`}
            title={done ? copy.markTodo : copy.markDone}
            aria-label={done ? copy.markTodo : copy.markDone}
            aria-pressed={done}
            onClick={(event) => {
              event.stopPropagation();
              onToggleDone();
            }}
          >
            {done && <Check size={15} aria-hidden="true" />}
          </button>
        )}

        <div className="quiz-card-text">
          <h3 className="quiz-card-title">{quiz.title}</h3>
          <div className="quiz-card-meta">
            <span>
              <FileText size={13} aria-hidden="true" />
              {questionCount}{" "}
              {questionCount === 1 ? copy.questionSingular : copy.questionPlural}
            </span>
            {scorePct !== null && !mergeMode && (
              <span
                className={`score-chip ${
                  scorePct >= 70 ? "is-good" : scorePct >= 40 ? "is-mid" : "is-low"
                }`}
                title={new Date(score!.at).toLocaleDateString(locale)}
              >
                {copy.lastScore} {scorePct}%
              </span>
            )}
            {done && !mergeMode && (
              <span className="done-chip">
                <Check size={12} aria-hidden="true" />
                {copy.reviewedOne}
              </span>
            )}
          </div>
        </div>
      </div>

      {!mergeMode && (
        <div className="quiz-card-foot">
          <span className="play-pill">
            <Play size={13} aria-hidden="true" />
            {copy.play}
          </span>
          {/* Delete lives inside the edit dialog — one action per card. */}
          <div className="row-actions" onClick={(event) => event.stopPropagation()}>
            <IconButton label={`${copy.edit}: ${quiz.title}`} onClick={onEdit}>
              <Edit3 size={15} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyState({
  copy,
  onImport,
  onLoadSample,
}: {
  copy: CopyText;
  onImport: () => void;
  onLoadSample: () => void;
}) {
  return (
    <section className="card empty-state rise">
      <div className="empty-stack" aria-hidden="true">
        <span />
        <span />
        <span>
          <Layers size={22} />
        </span>
      </div>
      <h2>{copy.emptyTitle}</h2>
      <p>{copy.emptyBody}</p>
      <div className="empty-actions">
        <button className="button button-primary" onClick={onImport}>
          <Plus size={17} aria-hidden="true" />
          {copy.importQuiz}
        </button>
        <button className="button button-ghost" onClick={onLoadSample}>
          <BookOpen size={17} aria-hidden="true" />
          {copy.loadSample}
        </button>
      </div>
    </section>
  );
}

function ImportView({
  copy,
  allCourses,
  allTopics,
  onCancel,
  onSave,
}: {
  copy: CopyText;
  allCourses: string[];
  allTopics: string[];
  onCancel: () => void;
  onSave: (quiz: Quiz) => void;
}) {
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const skillDownloadHref = `${import.meta.env.BASE_URL}skills.md`;

  const parsed = useMemo(() => parseQuiz(draft), [draft]);
  const valid = parsed.questions.length > 0 && Boolean(title.trim() || parsed.title);

  useEffect(() => {
    if (!titleTouched) setTitle(parsed.title);
  }, [parsed.title, titleTouched]);

  return (
    <main className="page player-page">
      <button className="button button-ghost top-return" onClick={onCancel}>
        <ArrowLeft size={16} aria-hidden="true" />
        {copy.back}
      </button>

      <header className="page-header">
        <div className="eyebrow">
          <span className="status-dot" />
          {copy.importQuiz}
        </div>
        <h1>{copy.importTitle}</h1>
        <p>{copy.importSubtitle}</p>
      </header>

      <div className="skill-card">
        <div className="skill-icon">
          <ListChecks size={22} aria-hidden="true" />
        </div>
        <div className="skill-copy">
          <span>{copy.skillFile}</span>
          <strong>{copy.downloadSkillTitle}</strong>
          <p>{copy.downloadSkillHint}</p>
        </div>
        <a className="button button-ghost" href={skillDownloadHref} download="skills.md">
          <Download size={16} aria-hidden="true" />
          {copy.downloadSkill}
        </a>
      </div>

      <Field label={copy.quizContent}>
        <textarea
          className="input textarea mono"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.formatPlaceholder}
          spellCheck={false}
        />
      </Field>

      {draft.trim() && (
        <div className={`parse-status ${parsed.questions.length ? "valid" : "invalid"}`}>
          {parsed.questions.length ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <AlertCircle size={16} aria-hidden="true" />
          )}
          {parsed.questions.length
            ? copy.importStatusFound(parsed.questions.length)
            : copy.importStatusMissing}
        </div>
      )}

      <Field label={copy.titleLabel}>
        <input
          className="input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleTouched(true);
          }}
          placeholder={copy.noTitlePlaceholder}
        />
      </Field>

      <div className="field-grid">
        <Field label={copy.optionalCourseLabel}>
          <SuggestField
            value={course}
            onChange={setCourse}
            options={allCourses}
            placeholder={copy.coursePlaceholder}
          />
        </Field>
        <Field label={copy.optionalTopicLabel}>
          <SuggestField
            value={topic}
            onChange={setTopic}
            options={allTopics}
            placeholder={copy.topicPlaceholder}
          />
        </Field>
      </div>

      <div className="form-actions">
        <button
          className="button button-primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: uid(),
              title: (title.trim() || parsed.title).trim(),
              course: course.trim(),
              topic: topic.trim(),
              createdAt: Date.now(),
              questions: parsed.questions,
            })
          }
        >
          <Save size={16} aria-hidden="true" />
          {copy.save}
        </button>
        <button className="button button-ghost" onClick={onCancel}>
          {copy.cancel}
        </button>
      </div>
    </main>
  );
}

function EditModal({
  quiz,
  copy,
  allCourses,
  allTopics,
  onClose,
  onSave,
  onEditQuestions,
  onDelete,
}: {
  quiz: Quiz;
  copy: CopyText;
  allCourses: string[];
  allTopics: string[];
  onClose: () => void;
  onSave: (patch: Partial<Quiz>) => void;
  onEditQuestions: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [course, setCourse] = useState(quiz.course || "");
  const [topic, setTopic] = useState(quiz.topic || "");

  return (
    <Modal title={copy.editQuiz} copy={copy} onClose={onClose}>
      <Field label={copy.titleLabel}>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
        />
      </Field>
      <div className="field-grid">
        <Field label={copy.courseLabel}>
          <SuggestField
            value={course}
            onChange={setCourse}
            options={allCourses}
            placeholder={copy.coursePlaceholder}
          />
        </Field>
        <Field label={copy.topicLabel}>
          <SuggestField
            value={topic}
            onChange={setTopic}
            options={allTopics}
            placeholder={copy.topicPlaceholder}
          />
        </Field>
      </div>
      <p className="soft-note">{copy.editMeta}</p>

      <button className="link-row" type="button" onClick={onEditQuestions}>
        <span>
          <ListChecks size={16} aria-hidden="true" />
          {copy.editQuestions}
        </span>
        <strong>
          {quiz.questions.length}{" "}
          {quiz.questions.length === 1 ? copy.questionSingular : copy.questionPlural}
        </strong>
      </button>

      <div className="modal-actions modal-actions-split">
        <button className="button button-danger-ghost" onClick={onDelete}>
          <Trash2 size={16} aria-hidden="true" />
          {copy.deleteQuiz}
        </button>
        <button className="button button-ghost" onClick={onClose}>
          {copy.cancel}
        </button>
        <button
          className="button button-primary"
          disabled={!title.trim()}
          onClick={() =>
            onSave({
              title: title.trim(),
              course: course.trim(),
              topic: topic.trim(),
            })
          }
        >
          <Save size={16} aria-hidden="true" />
          {copy.save}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Plays once when a merge is confirmed: the source slips fan out, slide
 * together, and are replaced by the single quiz they became.
 */
function MergeCeremony({
  sources,
  title,
  questionCount,
  copy,
  onDone,
}: {
  sources: string[];
  title: string;
  questionCount: number;
  copy: CopyText;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const shown = sources.slice(0, 4);

  return (
    <div className="ceremony" role="presentation">
      <div className="ceremony-stage">
        {shown.map((source, i) => (
          <div
            className="ceremony-slip"
            key={`${source}-${i}`}
            style={
              {
                "--y": `${(i - (shown.length - 1) / 2) * 46}px`,
                "--r": `${(i - (shown.length - 1) / 2) * 3.5}deg`,
                "--i": i,
              } as React.CSSProperties
            }
          >
            {source}
          </div>
        ))}

        <div className="ceremony-result">
          <Merge size={17} aria-hidden="true" />
          <strong>{title}</strong>
          <span>
            {questionCount}{" "}
            {questionCount === 1 ? copy.questionSingular : copy.questionPlural}
          </span>
        </div>
      </div>
    </div>
  );
}

function BackupModal({
  copy,
  quizCount,
  onClose,
  onExport,
  onRestore,
}: {
  copy: CopyText;
  quizCount: number;
  onClose: () => void;
  onExport: () => void;
  onRestore: (quizzes: Quiz[], mode: "add" | "replace") => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readFile = async (file: File) => {
    setError(null);
    setStaged(null);
    try {
      setStaged(readBackup(await file.text()));
    } catch (failure) {
      setError(
        (failure as Error).message === "empty"
          ? copy.importEmpty
          : copy.importUnreadable,
      );
    }
  };

  return (
    <Modal title={copy.backupTitle} copy={copy} onClose={onClose}>
      <p className="modal-copy">{copy.backupHint}</p>

      <div className="backup-actions">
        <button
          className="button button-primary"
          onClick={onExport}
          disabled={quizCount === 0}
        >
          <Download size={16} aria-hidden="true" />
          {copy.exportFile}
        </button>
        <button
          className="button button-ghost"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} aria-hidden="true" />
          {copy.importFile}
        </button>
        <input
          ref={fileRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="parse-status invalid">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {staged && (
        <div className="restore-panel">
          <div className="parse-status valid">
            <CheckCircle2 size={16} aria-hidden="true" />
            {copy.importFound(staged.length)}
          </div>
          <div className="modal-actions">
            <button
              className="button button-ghost"
              onClick={() => onRestore(staged, "add")}
            >
              {copy.importAdd}
            </button>
            <button
              className="button button-danger"
              title={copy.importReplaceWarn(quizCount)}
              onClick={() => onRestore(staged, "replace")}
            >
              {copy.importReplace}
            </button>
          </div>
          {quizCount > 0 && (
            <p className="soft-note restore-warn">
              {copy.importReplaceWarn(quizCount)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Full-page editor for a quiz's questions. */
function QuestionsView({
  quiz,
  copy,
  onCancel,
  onSave,
}: {
  quiz: Quiz;
  copy: CopyText;
  onCancel: () => void;
  onSave: (questions: QuizQuestion[]) => void;
}) {
  const [draft, setDraft] = useState<QuizQuestion[]>(() =>
    quiz.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
    })),
  );

  const patch = (index: number, next: Partial<QuizQuestion>) =>
    setDraft((prev) =>
      prev.map((question, i) => (i === index ? { ...question, ...next } : question)),
    );

  const setOption = (index: number, key: OptionKey, text: string) =>
    setDraft((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...question,
              options: question.options.map((option) =>
                option.key === key ? { ...option, text } : option,
              ),
            }
          : question,
      ),
    );

  /* A question is only saveable if the answer marked correct still has text. */
  const usable = draft.filter((question) => {
    const filled = question.options.filter((option) => option.text.trim());
    return (
      question.question.trim() &&
      filled.length >= 2 &&
      filled.some((option) => option.key === question.correct)
    );
  });
  const valid = usable.length > 0 && usable.length === draft.length;

  return (
    <main className="page">
      <button className="button button-ghost top-return" onClick={onCancel}>
        <ArrowLeft size={16} aria-hidden="true" />
        {copy.back}
      </button>

      <header className="page-header">
        <div className="eyebrow">
          <span className="status-dot" />
          {quiz.title}
        </div>
        <h1>{copy.questionsTitle}</h1>
        <p>{copy.questionsSubtitle}</p>
      </header>

      <div className="question-editor-list">
        {draft.map((question, index) => (
          <section className="question-editor" key={index}>
            <div className="question-editor-head">
              <span className="question-editor-index">{copy.questionN(index + 1)}</span>
              <input
                className="input question-editor-category"
                value={question.category}
                placeholder={copy.categoryLabel}
                onChange={(event) => patch(index, { category: event.target.value })}
                aria-label={copy.categoryLabel}
              />
              <IconButton
                label={`${copy.removeQuestion} ${index + 1}`}
                danger
                onClick={() =>
                  setDraft((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Trash2 size={15} aria-hidden="true" />
              </IconButton>
            </div>

            <Field label={copy.questionText}>
              <textarea
                className="input question-editor-text"
                value={question.question}
                onChange={(event) => patch(index, { question: event.target.value })}
              />
            </Field>

            <span className="editor-legend">{copy.optionsLabel}</span>
            <div className="option-editor-list">
              {question.options.map((option) => (
                <label
                  className={`option-editor ${
                    question.correct === option.key ? "is-correct" : ""
                  }`}
                  key={option.key}
                >
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={question.correct === option.key}
                    onChange={() => patch(index, { correct: option.key })}
                    aria-label={`${copy.correct}: ${option.key}`}
                  />
                  <span className="option-editor-key">{option.key}</span>
                  <input
                    className="input"
                    value={option.text}
                    onChange={(event) =>
                      setOption(index, option.key, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>

            <Field label={copy.explanationLabel}>
              <textarea
                className="input question-editor-text"
                value={question.explanation}
                onChange={(event) => patch(index, { explanation: event.target.value })}
              />
            </Field>
          </section>
        ))}
      </div>

      <button
        className="button button-ghost add-question"
        onClick={() => setDraft((prev) => [...prev, blankQuestion()])}
      >
        <Plus size={16} aria-hidden="true" />
        {copy.addQuestion}
      </button>

      {!valid && draft.length > 0 && (
        <div className="parse-status invalid">
          <AlertCircle size={16} aria-hidden="true" />
          {copy.needOneQuestion}
        </div>
      )}

      <div className="form-actions">
        <button
          className="button button-primary"
          disabled={!valid}
          onClick={() =>
            onSave(
              draft.map((question) => ({
                ...question,
                options: question.options.filter((option) => option.text.trim()),
              })),
            )
          }
        >
          <Save size={16} aria-hidden="true" />
          {copy.save}
        </button>
        <button className="button button-ghost" onClick={onCancel}>
          {copy.cancel}
        </button>
      </div>
    </main>
  );
}

function MergeModal({
  sources,
  copy,
  allCourses,
  allTopics,
  onClose,
  onCreate,
}: {
  sources: Quiz[];
  copy: CopyText;
  allCourses: string[];
  allTopics: string[];
  onClose: () => void;
  onCreate: (title: string, course: string, topic: string, deleteOriginals: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(sources[0]?.course || "");
  const [topic, setTopic] = useState("");
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const totalQuestions = sources.reduce((n, source) => n + source.questions.length, 0);

  return (
    <Modal title={copy.mergeTitle} copy={copy} onClose={onClose}>
      <div className="merge-summary">
        <div className="merge-summary-meta">
          {sources.length} {sources.length === 1 ? copy.quizSingular : copy.quizPlural}
          <i />
          {totalQuestions}{" "}
          {totalQuestions === 1 ? copy.questionSingular : copy.questionPlural}
        </div>
        {sources.map((source) => (
          <div className="merge-source" key={source.id}>
            <span>{source.title}</span>
            <strong>{source.questions.length}</strong>
          </div>
        ))}
      </div>

      <Field label={copy.newMergedTitle}>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={copy.mergePlaceholder}
          autoFocus
        />
      </Field>

      <div className="field-grid">
        <Field label={copy.courseLabel}>
          <SuggestField
            value={course}
            onChange={setCourse}
            options={allCourses}
            placeholder={copy.coursePlaceholder}
          />
        </Field>
        <Field label={copy.topicLabel}>
          <SuggestField
            value={topic}
            onChange={setTopic}
            options={allTopics}
            placeholder={copy.topicPlaceholder}
          />
        </Field>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={deleteOriginals}
          onChange={(event) => setDeleteOriginals(event.target.checked)}
        />
        <span>{copy.deleteOriginals}</span>
      </label>

      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose}>
          {copy.cancel}
        </button>
        <button
          className="button button-primary"
          onClick={() => onCreate(title, course, topic, deleteOriginals)}
        >
          <Merge size={16} aria-hidden="true" />
          {copy.create}
        </button>
      </div>
    </Modal>
  );
}

function Player({
  quiz,
  copy,
  onExit,
  onRecordScore,
}: {
  quiz: Quiz;
  copy: CopyText;
  onExit: () => void;
  onRecordScore: (id: string, score: QuizScore) => void;
}) {
  const [deck, setDeck] = useState<Quiz | null>(null);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Array<OptionKey | null>>([]);
  const [done, setDone] = useState(false);
  const [anim, setAnim] = useState(0);
  /* False while drilling a subset, so a partial run never overwrites the
     recorded score for the whole quiz. */
  const [isFullRun, setIsFullRun] = useState(true);

  const questions = deck?.questions || [];
  const total = questions.length;
  const question = questions[idx];
  const picked = picks[idx] ?? null;
  const answeredCount = picks.filter((pick) => pick !== null).length;
  const allAnswered = total > 0 && answeredCount === total;
  const score = picks.reduce(
    (n, pick, i) => n + (pick !== null && pick === questions[i].correct ? 1 : 0),
    0,
  );
  const pct = total ? Math.round((score / total) * 100) : 0;
  const shownPct = useCountUp(done ? pct : 0);

  const start = (source: Quiz, fullRun: boolean) => {
    const shuffled = shuffleQuiz(source);
    setDeck(shuffled);
    setPicks(new Array(shuffled.questions.length).fill(null));
    setIdx(0);
    setDone(false);
    setIsFullRun(fullRun);
    setAnim((value) => value + 1);
  };

  const startShuffled = () => start(quiz, true);

  const missed = done
    ? questions.filter((question, i) => picks[i] !== question.correct)
    : [];

  const practiceMissed = () =>
    start(
      { ...quiz, title: copy.missedDeckTitle, questions: missed },
      false,
    );

  const choose = (key: OptionKey) => {
    if (picked !== null) return;
    setPicks((prev) => {
      const next = [...prev];
      next[idx] = key;
      return next;
    });
  };

  const goPrev = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setAnim((value) => value + 1);
    }
  };

  /* Answer with A–D or 1–4, advance with Enter / arrows. Ignored while a
     text field has focus so it never fights with typing elsewhere. */
  useEffect(() => {
    if (!deck || done) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const current = questions[idx];
      if (!current) return;
      const answered = picks[idx] != null;

      if (!answered) {
        const letter = event.key.toUpperCase();
        const byLetter = current.options.find((option) => option.key === letter);
        const numeric = Number.parseInt(event.key, 10);
        const byNumber =
          Number.isFinite(numeric) && numeric >= 1
            ? current.options[numeric - 1]
            : undefined;
        const target2 = byLetter || byNumber;
        if (target2) {
          event.preventDefault();
          choose(target2.key);
          return;
        }
      }

      if (event.key === "Enter" || event.key === "ArrowRight") {
        if (answered) {
          event.preventDefault();
          goNext();
        }
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const goNext = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setAnim((value) => value + 1);
      return;
    }

    if (allAnswered) {
      setDone(true);
      if (isFullRun) {
        onRecordScore(quiz.id, { correct: score, total, at: Date.now() });
      }
      return;
    }

    const nextUnanswered = picks.findIndex((pick) => pick === null);
    if (nextUnanswered >= 0) {
      setIdx(nextUnanswered);
      setAnim((value) => value + 1);
    }
  };

  if (!deck) {
    const questionCount = quiz.questions.length;
    return (
      <main className="page player-page rise">
        <button className="button button-ghost top-return" onClick={onExit}>
          <ArrowLeft size={16} aria-hidden="true" />
          {copy.library}
        </button>
        <div className="eyebrow">
          <span className="status-dot" />
          {copy.reviewReady}
        </div>
        <h1>{quiz.title}</h1>
        <div className="player-meta">
          <span className="chip">
            <FileText size={13} aria-hidden="true" />
            {questionCount}{" "}
            {questionCount === 1 ? copy.questionSingular : copy.questionPlural}
          </span>
          {quiz.course && <span className="chip">{quiz.course}</span>}
          {quiz.topic && <span className="chip">{quiz.topic}</span>}
        </div>

        <div className="callout">
          <Shuffle size={19} aria-hidden="true" />
          <p>{copy.shuffleNotice}</p>
        </div>

        <button className="button button-primary button-large" onClick={startShuffled}>
          <Shuffle size={18} aria-hidden="true" />
          {copy.shuffleStart}
        </button>

        <p className="shortcut-hint">{copy.shortcutHint}</p>
      </main>
    );
  }

  if (done) {
    const ringColor =
      pct >= 70 ? "var(--correct)" : pct >= 40 ? "var(--accent)" : "var(--wrong)";

    return (
      <main className="page player-page rise">
        <button className="button button-ghost top-return" onClick={onExit}>
          <ArrowLeft size={16} aria-hidden="true" />
          {copy.library}
        </button>
        <div className="eyebrow">
          <span className="status-dot success" />
          {copy.result}
        </div>

        <div className="score-block">
          <div
            className="score-ring"
            style={{ "--pct": pct, "--ring": ringColor } as React.CSSProperties}
          >
            <span className="score-percent">{shownPct}%</span>
          </div>
          <div className="score-side">
            <strong className="score-count">
              {score} / {total}
            </strong>
            <p className="result-copy">{copy.scoreMessage(pct)}</p>
          </div>
        </div>

        <div className="result-list">
          {questions.map((item, i) => {
            const ok = picks[i] === item.correct;
            return (
              <div
                className={`result-row ${ok ? "" : "is-no"}`}
                key={`${item.question}-${i}`}
              >
                <span className={ok ? "result-mark ok" : "result-mark no"}>
                  {ok ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <X size={14} aria-hidden="true" />
                  )}
                </span>
                <span>{item.question}</span>
              </div>
            );
          })}
        </div>

        <div className="form-actions">
          {missed.length > 0 && (
            <button className="button button-primary" onClick={practiceMissed}>
              <Target size={16} aria-hidden="true" />
              {copy.practiceMissed(missed.length)}
            </button>
          )}
          <button
            className={
              missed.length > 0 ? "button button-ghost" : "button button-primary"
            }
            onClick={startShuffled}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {copy.retryShuffle}
          </button>
          <button className="button button-ghost" onClick={onExit}>
            {copy.library}
          </button>
        </div>
      </main>
    );
  }

  if (!question) return null;

  return (
    <main className="page player-page">
      <button className="button button-ghost top-return" onClick={onExit}>
        <ArrowLeft size={16} aria-hidden="true" />
        {copy.library}
      </button>

      <div className="progress-block">
        <div className="progress-meta">
          <span className="progress-count">
            {String(idx + 1).padStart(2, "0")}
            <span> / {String(total).padStart(2, "0")}</span>
          </span>
          <strong>{quiz.title}</strong>
        </div>

        {total <= 40 ? (
          <div className="tick-track" aria-hidden="true">
            {questions.map((item, i) => {
              const pick = picks[i];
              const state =
                i === idx
                  ? "is-current"
                  : pick === null || pick === undefined
                    ? ""
                    : pick === item.correct
                      ? "is-ok"
                      : "is-no";
              return <span className={state} key={`tick-${i}`} />;
            })}
          </div>
        ) : (
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${(answeredCount / total) * 100}%` }} />
          </div>
        )}
      </div>

      <section className="question-stage rise" key={anim}>
        <div className="question-category">{question.category}</div>
        <h1>{question.question}</h1>

        <div className="options-list">
          {question.options.map((option) => {
            const isPicked = picked === option.key;
            const isCorrect = option.key === question.correct;
            const answered = picked !== null;
            const state = answered
              ? isCorrect
                ? "correct"
                : isPicked
                  ? "wrong"
                  : "muted"
              : "";

            return (
              <button
                key={option.key}
                className={`choice ${state} ${isPicked ? "is-picked" : ""}`}
                onClick={() => choose(option.key)}
                disabled={answered}
              >
                <span className="choice-key">{option.key}</span>
                <span className="choice-text">{option.text}</span>
                {answered && (isCorrect || isPicked) && (
                  <span className="choice-mark">
                    {isCorrect ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <X size={18} aria-hidden="true" />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className={`explanation rise ${picked === question.correct ? "ok" : "no"}`}>
            <strong>
              {picked === question.correct ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <X size={13} aria-hidden="true" />
              )}
              {picked === question.correct ? copy.correct : copy.wrong}
            </strong>
            <p>{question.explanation}</p>
          </div>
        )}

        <div className="question-actions">
          <div>
            {idx > 0 && (
              <button className="button button-ghost" onClick={goPrev}>
                <ArrowLeft size={16} aria-hidden="true" />
                {copy.previous}
              </button>
            )}
          </div>
          <div>
            {picked !== null && (
              <button className="button button-primary" onClick={goNext}>
                {idx + 1 < total ? copy.nextQuestion : copy.seeResults}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * Text input with a styled suggestion list. Replaces `<datalist>`, whose
 * popup is drawn by the OS and cannot be themed. Free text is still the
 * point — the list only offers names already used in the library.
 */
function SuggestField({
  value,
  onChange,
  options,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  /* null = browsing every option; a string = filtering by what was typed. */
  const [query, setQuery] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);

  const matches = useMemo(() => {
    if (query === null) return options.slice(0, 8);
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 8);
    return options
      .filter((option) => option.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [options, query]);

  /* Positioned against the viewport so the list is never clipped by a
     modal's own scroll container. */
  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const roomBelow = window.innerHeight - box.bottom;
    const above = roomBelow < 210 && box.top > roomBelow;
    setAnchor({
      top: above ? box.top - 6 : box.bottom + 6,
      left: box.left,
      width: box.width,
      above,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  const hasOptions = options.length > 0;
  const show = open && matches.length > 0;

  const openList = () => {
    if (!hasOptions) return;
    setActive(-1);
    setQuery(null);
    setOpen(true);
  };

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    setActive(-1);
    setQuery(null);
    inputRef.current?.focus();
  };

  return (
    <div className="suggest">
      <input
        ref={inputRef}
        className="input suggest-input"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(event.target.value);
          setActive(-1);
          setOpen(hasOptions);
        }}
        onFocus={openList}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!show) return openList();
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && show && active >= 0) {
            event.preventDefault();
            commit(matches[active]);
          } else if (event.key === "Escape" || event.key === "Tab") {
            setOpen(false);
          }
        }}
      />

      {hasOptions && (
        <button
          type="button"
          className={`suggest-toggle ${show ? "is-open" : ""}`}
          tabIndex={-1}
          aria-hidden="true"
          onMouseDown={(event) => {
            event.preventDefault();
            if (open) setOpen(false);
            else {
              inputRef.current?.focus();
              openList();
            }
          }}
        >
          <ChevronDown size={15} />
        </button>
      )}

      {show && anchor && (
        <ul
          className={`suggest-list ${anchor.above ? "is-above" : ""}`}
          id={listId}
          role="listbox"
          style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
        >
          {matches.map((option, i) => {
            const current = option === value;
            return (
              <li key={option}>
                <button
                  type="button"
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={current}
                  className={`${i === active ? "is-active" : ""} ${
                    current ? "is-current" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(option)}
                >
                  <span>{option}</span>
                  {current && <Check size={14} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  copy,
  children,
  onClose,
}: {
  title: string;
  copy: CopyText;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  /* Play the exit animation before unmounting. */
  const requestClose = useCallback(() => {
    if (closing) return;
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(onClose, 180);
  }, [closing, onClose]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  return (
    <div
      className={`overlay ${closing ? "is-closing" : ""}`}
      onMouseDown={requestClose}
    >
      <section
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton label={copy.close} onClick={requestClose}>
            <X size={17} aria-hidden="true" />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}

function IconButton({
  label,
  children,
  danger = false,
  compact = false,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`icon-button ${danger ? "danger" : ""} ${compact ? "compact" : ""}`}
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
