import { db } from './firebaseConfig';
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';

// Helper: fetch subcollection documents for a given user ID and subcollection name
const getSubcollectionDocs = async (
  userId: string,
  subcollectionName: string
): Promise<Record<string, any>> => {
  const subcolRef = collection(db, 'users', userId, subcollectionName);
  const subcolSnap = await getDocs(subcolRef);
  const subcolData: Record<string, any> = {};
  subcolSnap.forEach((doc) => {
    subcolData[doc.id] = doc.data();
  });
  return subcolData;
};

// Fetch all students in the teacher’s class, **including their progress and projects subcollections**
export const getStudentsForTeacher = async (teacherId: string) => {
  const teacherSnap = await getDoc(doc(db, 'users', teacherId));
  if (!teacherSnap.exists()) return [];

  const classCode = teacherSnap.data().classCode;
  if (!classCode) return [];

  const q = query(
    collection(db, 'users'),
    where('classCode', '==', classCode),
    where('student', '==', true)
  );

  const querySnap = await getDocs(q);

  // Base student data (without subcollections)
  const baseStudents = querySnap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  // Fetch progress and projects for all students in parallel
  const studentsWithDetails = await Promise.all(
    baseStudents.map(async (student) => {
      const [progress, projects] = await Promise.all([
        getSubcollectionDocs(student.id, 'progress'),
        getSubcollectionDocs(student.id, 'projects'),
      ]);

      return {
        ...student,
        progress,
        projects,
      };
    })
  );

  return studentsWithDetails;
};

// Optionally get a specific student’s project summaries (can be removed if not used)
export const getStudentProjects = (userDoc: any) => {
  return userDoc.projects || {};
};

// Optionally get a specific student’s module quiz/progress summaries (can be removed if not used)
export const getStudentProgress = (userDoc: any) => {
  return userDoc.progress || {};
};

// Save list of student UIDs to teacher's doc (if needed)
export const saveClassStudentList = async (
  teacherId: string,
  studentIds: string[]
) => {
  const teacherRef = doc(db, 'users', teacherId);
  await updateDoc(teacherRef, { classStudents: studentIds });
};

export const getUserProfile = async (uid: string) => {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;
  return userSnap.data();
};
