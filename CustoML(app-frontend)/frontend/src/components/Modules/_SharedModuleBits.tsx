/**
 * Shared hooks and components for modules.
 * Uses AuthContext + firebase/learning like Module 1.
 */
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getModuleProgress, saveModuleProgress } from "../../firebase/learning";

export type Choice = { value: string; label: string };
export type ProgressCheck = {
  id: string;
  prompt: string;
  type: "mcq" | "tf" | "dropdown";
  choices: Choice[];
  correct: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: Choice[];
  correct: string;
};

export function useModuleState(moduleKey: string, checks: ProgressCheck[], quiz: QuizQuestion[]) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizAttempts, setQuizAttempts] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const data = await getModuleProgress(user.uid, moduleKey);
        if (data) {
          setAnswers(data.answers ?? {});
          setDisabled(data.disabled ?? {});
          setAttempts(data.attempts ?? {});
          setQuizAnswers(data.quizAnswers ?? {});
          setQuizAttempts(data.quizAttempts ?? 0);
          setQuizSubmitted(data.quizSubmitted ?? false);
          setQuizScore(data.quizScore ?? null);
          setCompleted(data.completed ?? false);
        }
      } catch (e) {
        console.error("Load module progress failed:", e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [user, moduleKey]);

  const persist = async (patch: any) => {
    if (!user) return;
    const merged = {
      answers, disabled, attempts, quizAnswers, quizAttempts, quizSubmitted, quizScore, completed,
      ...patch
    };
    await saveModuleProgress(user.uid, moduleKey, merged);
  };

  const answerCheck = async (id: string, val: string) => {
    const isCorrect = checks.find(c => c.id === id)?.correct === val;
    const nextAttempts = { ...attempts, [id]: (attempts[id] ?? 0) + 1 };
    const nextAnswers = { ...answers, [id]: val };
    const nextDisabled = { ...disabled };
    if (isCorrect) nextDisabled[id] = true;
    setAttempts(nextAttempts);
    setAnswers(nextAnswers);
    setDisabled(nextDisabled);
    await persist({ attempts: nextAttempts, answers: nextAnswers, disabled: nextDisabled });
  };

  const retakeCheck = async (id: string) => {
    const nextDisabled = { ...disabled };
    delete nextDisabled[id];
    setDisabled(nextDisabled);
    await persist({ disabled: nextDisabled });
  };

  const setQuizAnswer = (id: string, val: string) => {
    const next = { ...quizAnswers, [id]: val };
    setQuizAnswers(next);
  };

  const submitQuiz = async () => {
    const total = quiz.length;
    let correctCount = 0;
    for (const q of quiz) {
      if (quizAnswers[q.id] === q.correct) correctCount += 1;
    }
    const scorePct = Math.round((correctCount / total) * 100);
    const pass = scorePct >= 75;
    const nextAttempts = quizAttempts + 1;
    setQuizAttempts(nextAttempts);
    setQuizSubmitted(true);
    setQuizScore(scorePct);
    setCompleted(pass);
    await persist({ quizAttempts: nextAttempts, quizSubmitted: true, quizScore: scorePct, completed: pass });
  };

  const retakeQuiz = async () => {
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizAnswers({});
    await persist({ quizSubmitted: false, quizScore: null, quizAnswers: {} });
  };

  return {
    user, loaded, answers, disabled, attempts,
    quizAnswers, quizAttempts, quizSubmitted, quizScore, completed,
    answerCheck, retakeCheck, setQuizAnswer, submitQuiz, retakeQuiz
  };
}

export const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  return (
    <div className="p-5 my-4 rounded-2xl shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

export const InlineDiagram: React.FC<{ variant: "confusion" | "loss" | "pipeline" | "bars"; label?: string }> = ({ variant, label }) => {
  switch (variant) {
    case "confusion":
      return (
        <svg width="260" height="180" role="img" aria-label={label ?? "Confusion Matrix"}>
          <rect x="20" y="20" width="200" height="120" fill="none" stroke="black" />
          {[0,1].map(r => [0,1].map(c => (
            <rect key={r+"-"+c} x={20+c*100} y={20+r*60} width="100" height="60" fill={r===c ? "#d1fae5" : "#fee2e2"} stroke="#999"/>
          )))}
          <text x="70" y="55" fontSize="12">TP</text>
          <text x="170" y="55" fontSize="12">FN</text>
          <text x="70" y="115" fontSize="12">FP</text>
          <text x="170" y="115" fontSize="12">TN</text>
        </svg>
      );
    case "loss":
      return (
        <svg width="260" height="160" role="img" aria-label={label ?? "Loss Curve"}>
          <rect x="30" y="20" width="200" height="110" fill="none" stroke="black" />
          <polyline points="30,30 60,45 90,60 120,75 150,90 180,105 230,125" fill="none" stroke="black"/>
          <text x="120" y="150" fontSize="12">Epochs →</text>
          <text x="0" y="85" fontSize="12" transform="rotate(-90 0,85)">Loss →</text>
        </svg>
      );
    case "pipeline":
      return (
        <svg width="320" height="120" role="img" aria-label={label ?? "ML Pipeline"}>
          {["Data", "Preprocess", "Train", "Evaluate", "Deploy"].map((t,i) => (
            <g key={i}>
              <rect x={20 + i*58} y="30" width="54" height="40" fill="#f3f4f6" stroke="#111827" rx="6"/>
              <text x={47 + i*58} y="55" textAnchor="middle" fontSize="10">{t}</text>
            </g>
          ))}
          {[0,1,2,3].map(i => (
            <line key={i} x1={74 + i*58} y1="50" x2={78 + i*58} y2="50" stroke="#111827"/>
          ))}
        </svg>
      );
    case "bars":
      return (
        <svg width="260" height="160" role="img" aria-label={label ?? "Bar Comparison"}>
          <rect x="30" y="20" width="200" height="110" fill="none" stroke="black" />
          <rect x="50" y="80" width="20" height="50" />
          <rect x="100" y="60" width="20" height="70" />
          <rect x="150" y="40" width="20" height="90" />
          <rect x="200" y="90" width="20" height="40" />
          <text x="120" y="150" fontSize="12" textAnchor="middle">Models</text>
        </svg>
      );
  }
};
