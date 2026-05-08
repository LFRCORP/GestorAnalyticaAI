import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  or
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';

export const useFirestoreProjects = () => {
  const { user, userData } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // If user is hacedor, they see all projects
    // Otherwise, they see:
    // 1. Their own projects
    // 2. Public projects
    // 3. Projects where they are in allowedUsers
    const isHacedor = user.uid === 'jhJUq4sUNDfFl78GNJRYn5CIFv02' || userData?.role === 'hacedor';
    
    let q;
    if (isHacedor) {
      q = query(
        collection(db, 'projects'),
        orderBy('updatedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'projects'),
        or(
          where('userId', '==', user.uid),
          where('visibility', '==', 'public'),
          where('allowedUsers', 'array-contains', user.uid)
        ),
        orderBy('updatedAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => doc.data() as Project);
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userData]);

  const addProject = async (project: Project) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', project.id);
    await setDoc(projectRef, {
      ...project,
      userId: user.uid,
      visibility: project.visibility || 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const updateProject = async (projectId: string, data: Partial<Project>) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  };

  return { projects, loading, addProject, updateProject, deleteProject };
};
