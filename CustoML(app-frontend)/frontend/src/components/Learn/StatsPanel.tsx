import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getUserProgress } from "../../firebase/learning";

interface ModuleProgress {
  completed: boolean;
  score?: number | null;
}

// Ordered list of module names
const MODULE_TITLES: string[] = [
  "Intro to ML",
  "Classification vs Regression",
  "Model Types",
  "Data Preprocessing",
  "Model Architecture",
  "Training Settings",
  "Evaluation Metrics",
  "Loss Functions",
  "Overfitting & Generalization",
  "Deploying Models",
  "Course Assessment",
];

export default function StatsPanel() {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<Record<string, ModuleProgress> | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserProgress(user.uid).then(setProgressData);
  }, [user]);

  // Sort modules numerically
  const sortedModules = progressData
    ? Object.entries(progressData).sort(([aId], [bId]) => {
        const aNum = parseInt(aId.replace("module", ""), 10);
        const bNum = parseInt(bId.replace("module", ""), 10);
        return aNum - bNum;
      })
    : [];

  return (
    <div className="p-6 bg-white shadow rounded text-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600">📊 Your Learning Stats</h2>

      {progressData ? (
        sortedModules.length > 0 ? (
          <div className="space-y-4">
            {sortedModules.map(([moduleId, data]) => {
              const index = parseInt(moduleId.replace("module", ""), 10) - 1; // convert "module1" → index 0
              const title = MODULE_TITLES[index] || moduleId;

              return (
                <div key={moduleId} className="p-4 border rounded">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p>
                    <span className="font-semibold">Quiz Score:</span>{" "}
                    {data.score !== null && data.score !== undefined
                      ? `${data.score}%`
                      : "Not Attempted"}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {data.completed ? "✅ Passed" : "❌ Incomplete"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="italic text-gray-500">No modules started yet.</p>
        )
      ) : (
        <p className="italic text-gray-500">Loading...</p>
      )}
    </div>
  );
}
