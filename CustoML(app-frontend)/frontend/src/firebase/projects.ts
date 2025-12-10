// firebase/projects.ts
import { db, storage } from "./firebaseConfig";
import { doc, setDoc, getDocs, collection, query, where, Timestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";




interface ProjectData {
  userId: string;
  projectId: string;
  name: string;
  modelType: string;
  dataType: string;
  datasetName: string;
  metrics: { accuracy?: number; loss?: number; mae?: number };
  createdAt: Timestamp;
  description: string;
  location: string;
  inputs: string[];
  output: string;
  layers: any; // Adjust type as needed
  preprocessing: {normalize: boolean; scale: boolean; resize: boolean;};
  layersize: string;
  kernelsize: string;
  padding: string;
  epochs: number;
  batchsize: number;
  graphURLs: any; // URLs for graphs
}

export async function saveProject(data: ProjectData) {
  const { userId, projectId, ...meta } = data;

  // Upload files to Storage
  const basePath = `users/${userId}/projects/${projectId}`;
  const uploadAndGetURL = async (path: string, file: File) => {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };


  // Save metadata to Firestore
  const docRef = doc(db, `users/${userId}/projects/${projectId}`);
  await setDoc(docRef, {
    ...meta,
    createdAt: meta.createdAt || Timestamp.now(),
  });
}

export async function getUserProjects(userId: string) {
  const q = query(collection(db, `users/${userId}/projects`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteUserProject(userId: string, projectId: string) {
  if (!userId || !projectId) throw new Error("Missing userId or projectId");
  const docRef = doc(db, `users/${userId}/projects`, projectId);
  await deleteDoc(docRef);
}