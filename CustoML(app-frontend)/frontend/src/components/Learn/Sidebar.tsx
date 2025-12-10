import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getUserProgress } from "../../firebase/learning";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

const modules = [
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
  "Course Assessment"
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const [progress, setProgress] = useState<Record<string, { completed: boolean }> | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);

  // Fetch progress
  useEffect(() => {
    if (!user?.uid) return;
    getUserProgress(user.uid).then((data) => {
      setProgress(data);
      localStorage.setItem("userProgress", JSON.stringify(data));
    });
  }, [user]);

  // Fetch teacher status
  useEffect(() => {
    if (!user?.uid) return;
    const fetchTeacherStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setIsTeacher(userDoc.data()?.teacher === true);
        }
      } catch (err) {
        console.error("Error fetching teacher status:", err);
      }
    };
    fetchTeacherStatus();
  }, [user]);

  return (
    <aside className="w-64 bg-white border-r shadow-md h-screen sticky top-0 p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold text-purple-700 mb-4">Course Modules</h2>
        <ul className="space-y-3 pl-6 border-l-2 border-gray-300 relative">
          {modules.map((title, idx) => {
            const slug = `/learn/module/${idx + 1}`;
            const done = progress?.[`module${idx + 1}`]?.completed ?? false;
            const isActive = location.pathname === slug;
            return (
              <li key={slug} className="relative group">
                <div
                  className={`absolute -left-[11px] top-2 w-3 h-3 rounded-full transition ${
                    done ? "bg-purple-600" : "bg-gray-300"
                  } group-hover:scale-110`}
                />
                <Link
                  to={slug}
                  className={`block px-2 py-1 rounded-md font-semibold text-sm ${
                    isActive
                      ? "bg-purple-100 text-purple-800"
                      : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  {title}
                  {done && <span className="ml-1 text-green-500">✓</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <hr className="my-4 border-gray-300" />
        <ul className="space-y-2">
          <li>
            <Link
              to="/learn/stats"
              className="block px-4 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100"
            >
              📊 Your Stats
            </Link>
          </li>

          {isTeacher && (
            <li>
              <Link
                to="/learn/reports"
                className="block px-4 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100"
              >
                📝 Teacher Report
              </Link>
            </li>
          )}

          <li>
            <Link
              to="/learn"
              className="block px-4 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100"
            >
              🚀 Quick Guide
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
