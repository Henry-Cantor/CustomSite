import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import LearnPage from "./pages/Learn";
import CreatePage from "./pages/Create";
import TestPage from "./pages/Test";
import LearnLayout from "./components/Learn/LearnLayout";
import Module1 from "./components/Modules/Module1";
import Module2 from "./components/Modules/Module2";
import Module3 from "./components/Modules/Module3";
import Module4 from "./components/Modules/Module4";
import Module5 from "./components/Modules/Module5";
import Module6 from "./components/Modules/Module6";
import Module7 from "./components/Modules/Module7";
import Module8 from "./components/Modules/Module8";
import Module9 from "./components/Modules/Module9";
import Module10 from "./components/Modules/Module10";
import Module11 from "./components/Modules/Module11";
import QuickGuide from "./components/Learn/QuickGuide";
import StatsPanel from "./components/Learn/StatsPanel";
import { ProgressProvider } from "./context/ProgressContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import { JSX } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import WorkPage from "./pages/Work";
import ReportsPage from "./components/Learn/ReportPage";
import React, { useEffect, useState, createContext, useContext } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

// const TeacherContext = createContext(false);
// const TeacherLoading = createContext(true);
// export const useTeacher = () => useContext(TeacherContext);
// export const useLoading = () => useContext(TeacherLoading)
interface TeacherContextType {
  isTeacher: boolean;
  teacherLoading: boolean;
}

export const TeacherContext = createContext<TeacherContextType>({
  isTeacher: false,
  teacherLoading: true
});

function MLIcon() {
  return (
    <svg
      className="w-8 h-8 text-indigo-400"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="32" cy="32" r="5" />
      <circle cx="32" cy="8" r="4" />
      <circle cx="53.3" cy="18" r="4" />
      <circle cx="53.3" cy="46" r="4" />
      <circle cx="32" cy="56" r="4" />
      <circle cx="10.7" cy="46" r="4" />
      <circle cx="10.7" cy="18" r="4" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="10.7" y1="18" x2="53.3" y2="46" />
      <line x1="53.3" y1="18" x2="10.7" y2="46" />
    </svg>
  );
}

function PrivateRoutes({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [validLicense, setValidLicense] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const checkLicenseAndRole = async () => {
      console.log("checking license and role")
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setValidLicense(false);
        setIsTeacher(false);
      } else {
        const data = snap.data();

        let expiresAtDate: Date | null = null;
        if (data.expiresAt) {
          if (typeof data.expiresAt.toDate === "function") {
            expiresAtDate = data.expiresAt.toDate();
          } else if (data.expiresAt instanceof Date) {
            expiresAtDate = data.expiresAt;
          } else if (typeof data.expiresAt === "string") {
            expiresAtDate = new Date(data.expiresAt);
          }
        }
        console.log("teacher: " + data.teacher)
        setIsTeacher(Boolean(data.teacher));

        const now = new Date();
        setValidLicense(expiresAtDate ? expiresAtDate > now : false);
      }

      setCheckingLicense(false);
    };

    if (user) checkLicenseAndRole();
  }, [user]);

  if (loading || (user && checkingLicense)) {
    return <div className="text-center p-8 text-gray-600">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!validLicense) {
    alert("Your account has expired. Please visit customlearning.vercel.app and renew your subscription.");
    return <Navigate to="/login" replace />;
  }

  // Pass isTeacher down via context or as a prop in your app
  return (
    <TeacherContext.Provider value={{isTeacher, teacherLoading: checkingLicense}}>
      {children}
    </TeacherContext.Provider>
  );
}


export default function App() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    navigate("/login");
  };
  const [appLoading, setAppLoading] = React.useState(true);

  // const isTeacher = await useTeacher();
  // console.log("app teacher: " + isTeacher)
  // useEffect(() => {
  //   const fetchRole = async () => {
  //     if (!user) return;
  //     const { getUserProfile } = await import('./firebase/teacherReport');
  //     const profile = await getUserProfile(user.uid);
  //     setIsTeacher(profile?.teacher ?? false);
  //   };
  //   fetchRole();
  // }, [user]);

  // function TeacherRoutes({ children }: { children: JSX.Element }) {
  //   const { user, loading } = useAuth();
  //   const [isTeacher, setIsTeacher] = useState<boolean | null>(null);

  //   useEffect(() => {
  //     const fetchRole = async () => {
  //       if (!user) return setIsTeacher(false);
  //       const { getUserProfile } = await import('./firebase/teacherReport');
  //       const profile = await getUserProfile(user.uid);
  //       setIsTeacher(profile?.teacher ?? false);
       
  //     };
  //     fetchRole();
  //   }, [user]);
  //   console.log("isTeacher:", isTeacher);
  //   if (loading || isTeacher === null) {
  //     return <div className="text-center p-8 text-gray-600">Loading...</div>;
  //   }

  //   return isTeacher ? children : <Navigate to="/" replace />;
  // }
  return (
    
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-gray-100">
        <nav className="sticky top-0 z-50 shadow bg-gray-900 text-white px-6 py-4 flex items-center">
          <NavLink
            to="/create"
            aria-label="Go to Create"
            className="flex items-center mr-auto space-x-2 px-3 py-1 rounded"
          >
            <MLIcon />
            <span className="text-indigo-400 font-bold text-xl select-none">
              CustoMLearning
            </span>
          </NavLink>

          

          <div className="flex space-x-12">
            

            <NavLink
              to="/learn"
              className={({ isActive }) =>
                `font-semibold text-lg ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Learn
            </NavLink>
            <NavLink
              to="/create"
              className={({ isActive }) =>
                `font-semibold text-lg ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Create
            </NavLink>
            <NavLink
              to="/test"
              className={({ isActive }) =>
                `font-semibold text-lg ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Test
            </NavLink>
            <NavLink
              to="/work"
              className={({ isActive }) =>
                `font-semibold text-lg ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Projects
            </NavLink>
            <NavLink
              to="/login"
              onClick={() => handleLogout()}
              className={({ isActive }) =>
                `font-semibold text-lg ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Log Out
            </NavLink>
          </div>
        </nav>

        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/create" replace />} />

            <Route
              path="/create"
              element={
                <PrivateRoutes>
                  <CreatePage />
                </PrivateRoutes>
              }
            />

            <Route
              path="/test"
              element={
                <PrivateRoutes>
                  <TestPage />
                </PrivateRoutes>
              }
            />

             <Route
              path="/work"
              element={
                <PrivateRoutes>
                  <WorkPage />
                </PrivateRoutes>
              }
            />



            <Route
              path="/learn/*"
              element={
                <PrivateRoutes>
                  <ProgressProvider>
                    <LearnLayout />
                  </ProgressProvider>
                </PrivateRoutes>
              }
            >
              <Route index element={<QuickGuide />} />
              <Route path="module/1" element={<Module1 />} />
              <Route path="module/2" element={<Module2 />} />
              <Route path="module/3" element={<Module3 />} />
              <Route path="module/4" element={<Module4 />} />
              <Route path="module/5" element={<Module5 />} />
              <Route path="module/6" element={<Module6 />} />
              <Route path="module/7" element={<Module7 />} />
              <Route path="module/8" element={<Module8 />} />
              <Route path="module/9" element={<Module9 />} />
              <Route path="module/10" element={<Module10 />} />
              <Route path="module/11" element={<Module11 />} />
              <Route path="stats" element={<StatsPanel />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/create" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
