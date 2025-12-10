import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsForTeacher } from '../../firebase/teacherReport';

interface Project {
  name: string;
  modelType: string;
}

interface ModuleProgress {
  score?: number;
  quizRetakes?: number;
  [key: string]: any;
}

interface StudentData {
  id: string;
  name?: string;
  progress?: Record<string, ModuleProgress>;
  projects?: Record<string, Project>;
}

type DataByStudent = Record<
  string,
  {
    modulesScores: Record<string, { score: number; quizRetakes: number }>;
    projects: Project[];
  }
>;

type DataByModule = Record<
  string,
  { studentName: string; score: number; quizRetakes: number }[]
>;

// Order to enforce
const MODULE_ORDER = [
  'module1',
  'module2',
  'module3',
  'module4',
  'module5',
  'module6',
  'module7',
  'module8',
  'module9',
  'module10',
  'module11',
];

const MODULE_NAMES_MAP: Record<string, string> = {
  module1: 'Intro to ML',
  module2: 'Classification vs Regression',
  module3: 'Model Types',
  module4: 'Data Preprocessing',
  module5: 'Model Architecture',
  module6: 'Training Settings',
  module7: 'Evaluation Metrics',
  module8: 'Loss Functions',
  module9: 'Overfitting & Generalization',
  module10: 'Deploying Models',
  module11: 'Course Assessment',
};

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [data, setData] = useState<DataByStudent | DataByModule>({});
  const [loading, setLoading] = useState(false);
  const [organizeByQuiz, setOrganizeByQuiz] = useState(false);

  const loadStudentData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fetchedStudents = await getStudentsForTeacher(user.uid);
      setStudents(fetchedStudents);
      processData(fetchedStudents);
    } finally {
      setLoading(false);
    }
  };

  const processData = (studentsData: StudentData[]) => {
    if (organizeByQuiz) {
      const result: DataByModule = {};
      MODULE_ORDER.forEach((modName) => {
        result[modName] = [];
        studentsData.forEach((student) => {
          const mod = student.progress?.[modName];
          if (mod && typeof mod.score === 'number') {
            result[modName].push({
              studentName: student.name || student.id,
              score: mod.score,
              quizRetakes:
                typeof mod.quizRetakes === 'number' ? mod.quizRetakes : 0,
            });
          }
        });
      });
      setData(result);
    } else {
      const result: DataByStudent = {};
      studentsData.forEach((student) => {
        const modulesScores: Record<
          string,
          { score: number; quizRetakes: number }
        > = {};

        if (student.progress) {
          MODULE_ORDER.forEach((modName) => {
            const mod = student.progress?.[modName];
            if (mod && typeof mod.score === 'number') {
              modulesScores[modName] = {
                score: mod.score,
                quizRetakes:
                  typeof mod.quizRetakes === 'number' ? mod.quizRetakes : 0,
              };
            }
          });
        }

        let projects: Project[] = [];
        if (student.projects) {
          projects = Object.values(student.projects).map((proj) => ({
            name: proj.name || 'Unnamed Project',
            modelType: proj.modelType || 'Unknown',
          }));
        }

        result[student.name || student.id] = {
          modulesScores,
          projects,
        };
      });
      setData(result);
    }
  };

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (students.length) {
      processData(students);
    }
  }, [organizeByQuiz, students]);

  const Button = ({
    onClick,
    children,
    disabled = false,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
    >
      {children}
    </button>
  );

  const Switch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <label className="flex items-center cursor-pointer text-sm">
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
      <span className="ml-2">Organize by Quiz</span>
    </label>
  );

  const Accordion = ({
    items,
  }: {
    items: { title: string; content: React.ReactNode }[];
  }) => (
    <div className="space-y-2 mt-2">
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

  const renderByStudent = (dataStudent: DataByStudent) => {
    return (
      <Accordion
        items={Object.entries(dataStudent).map(([studentName, info]) => {
          const modulesScores = info.modulesScores ?? {};
          const projects = info.projects ?? [];
          return {
            title: `Student: ${studentName}`,
            content: (
              <>
                <div>
                  <strong>Quiz Scores:</strong>
                  {Object.keys(modulesScores).length ? (
                    <ul className="list-disc list-inside">
                      {MODULE_ORDER.filter((mod) => mod in modulesScores).map(
                        (modName) => {
                          const modData = modulesScores[modName];
                          return (
                            <li key={modName}>
                              {MODULE_NAMES_MAP[modName] || modName}:{' '}
                              {modData.score.toFixed(1)}% | Retakes:{' '}
                              {modData.quizRetakes}
                            </li>
                          );
                        }
                      )}
                    </ul>
                  ) : (
                    <div>No quiz scores available</div>
                  )}
                </div>
                <div className="mt-2">
                  <strong>Projects:</strong>
                  {projects.length ? (
                    <ul className="list-disc list-inside">
                      {projects.map((proj, idx) => (
                        <li key={idx}>
                          {proj.name} ({proj.modelType})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div>No projects available</div>
                  )}
                </div>
              </>
            ),
          };
        })}
      />
    );
  };

  const renderByModule = (dataModule: DataByModule) => {
    return (
      <Accordion
        items={MODULE_ORDER.filter((mod) => dataModule[mod]).map(
          (moduleName) => ({
            title: `Module: ${MODULE_NAMES_MAP[moduleName] || moduleName}`,
            content:
              dataModule[moduleName]?.length ? (
                dataModule[moduleName].map(
                  ({ studentName, score, quizRetakes }, i) => (
                    <div key={i}>
                      <strong>{studentName}:</strong> Score:{' '}
                      {score.toFixed(1)}% | Retakes: {quizRetakes}
                    </div>
                  )
                )
              ) : (
                <div>No data available</div>
              ),
          })
        )}
      />
    );
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <Switch
          checked={organizeByQuiz}
          onChange={() => setOrganizeByQuiz(!organizeByQuiz)}
        />
        <Button onClick={loadStudentData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {organizeByQuiz
        ? renderByModule(data as DataByModule)
        : renderByStudent(data as DataByStudent)}
    </div>
  );
};

export default ReportsPage;
