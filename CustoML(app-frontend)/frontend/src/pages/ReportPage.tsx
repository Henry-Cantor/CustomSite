// src/pages/ReportsPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getStudentsForTeacher,
  getUserProfile
} from '../firebase/teacherReport';

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [organizeByQuiz, setOrganizeByQuiz] = useState(false);
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);

  const loadStudentData = async () => {
    if (!user) return;
    setLoading(true);
    const students = await getStudentsForTeacher(user.uid);
    localStorage.setItem('classStudentProfiles', JSON.stringify(students));
    setStudentProfiles(students);
    await loadData(students);
    setLoading(false);
  };

  const loadData = async (students: any[]) => {
    const result: any = {};
    if (organizeByQuiz) {
      const quizIds = new Set<string>();
      students.forEach(student => {
        const quizzes = student.progress?.quizzes || {};
        Object.keys(quizzes).forEach(qid => quizIds.add(qid));
      });
      quizIds.forEach(qid => {
        result[qid] = [];
        students.forEach(student => {
          const qdata = student.progress?.quizzes?.[qid];
          if (qdata) {
            result[qid].push({
            studentName: student.name || student.id,
            score: qdata.score,
            retakes: qdata.retakes || 0,
            });
          }
        });
      });
    } else {
      students.forEach(student => {
        result[student.name || student.id] = student.progress?.quizzes || {};
      });
    }
    setData(result);
  };

  useEffect(() => {
    const cached = localStorage.getItem('classStudentProfiles');
    if (cached) {
      const parsed = JSON.parse(cached);
      setStudentProfiles(parsed);
      loadData(parsed);
    } else {
      loadStudentData();
    }
  }, []);

  useEffect(() => {
    if (studentProfiles.length > 0) loadData(studentProfiles);
  }, [organizeByQuiz]);

  useEffect(() => {
    const checkTeacher = async () => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      setIsTeacher(profile?.role === 'teacher');
    };
    checkTeacher();
  }, [user]);

  if (isTeacher === false) return <div>Access denied.</div>;

  const Button = ({ onClick, children, disabled = false }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {children}
    </button>
  );

  const Switch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div className="w-10 h-4 bg-gray-400 rounded-full shadow-inner"></div>
        <div
          className={`dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition ${
            checked ? 'translate-x-full bg-green-500' : ''
          }`}
        ></div>
      </div>
      <span className="ml-3 text-sm">Organize by Quiz</span>
    </label>
  );

  const Accordion = ({ items }: { items: any[] }) => (
    <div className="space-y-2">
      {items.map(({ title, content }, idx) => (
        <details key={idx} className="border rounded">
          <summary className="cursor-pointer p-2 font-semibold bg-gray-100">
            {title}
          </summary>
          <div className="p-3 space-y-1">{content}</div>
        </details>
      ))}
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Switch checked={organizeByQuiz} onChange={() => setOrganizeByQuiz(!organizeByQuiz)} />
        <Button onClick={loadStudentData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Class List'}
        </Button>
      </div>

      {organizeByQuiz ? (
        <Accordion
          items={Object.entries(data).map(([quizId, scores]: any) => ({
            title: `Quiz: ${quizId}`,
            content: scores.map((entry: any) => (
              <div key={entry.studentName}>
                <p>
                  <strong>{entry.studentName}:</strong> Score: {entry.score}% | Retakes: {entry.retakes}
                </p>
              </div>
            )),
          }))}
        />
      ) : (
        <Accordion
          items={Object.entries(data).map(([studentName, quizzes]: any) => ({
            title: `Student: ${studentName}`,
            content: Object.entries(quizzes || {}).map(([quizId, info]: any) => (
              <div key={quizId}>
                <p>
                  <strong>{quizId}:</strong> Score: {info.score}% | Retakes: {info.retakes}
                </p>
              </div>
            )),
          }))}
        />
      )}
    </div>
  );
};

export default ReportsPage;