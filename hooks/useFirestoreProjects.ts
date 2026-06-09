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
        collection(db, 'projects')
      );
    } else {
      q = query(
        collection(db, 'projects'),
        or(
          where('userId', '==', user.uid),
          where('visibility', '==', 'public'),
          where('allowedUsers', 'array-contains', user.email)
        )
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let projectsData = snapshot.docs.map(doc => doc.data() as Project);
      
      // Filter out soft-deleted projects for normal users
      if (!isHacedor) {
        projectsData = projectsData.filter(p => !p.deleted);
      }
      
      projectsData.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userData]);

  /**
   * Strips base64 image data from documents before saving to Firestore.
   * Images are already stored in Firebase Storage (storageUrl), so the
   * large inlineData.data blobs are not needed in the database and would
   * exceed Firestore's 1MB document limit, causing silent write failures.
   */
  const sanitizeForFirestore = (data: Partial<Project>): Partial<Project> => {
    const sanitized = { ...data };

    if (sanitized.documents) {
      sanitized.documents = sanitized.documents.map(doc => ({
        ...doc,
        // Strip base64 page data — images live in Storage (storageUrl)
        pages: (doc.pages || []).map(page => ({
          inlineData: {
            data: '',  // cleared — use storageUrl to re-fetch when needed
            mimeType: page.inlineData?.mimeType || 'image/jpeg',
          },
          storageUrl: page.storageUrl,
        })),
        // Also strip base64 from historical versions
        versions: (doc.versions || []).map(v => ({
          ...v,
          pages: (v.pages || []).map(page => ({
            inlineData: {
              data: '',
              mimeType: page.inlineData?.mimeType || 'image/jpeg',
            },
            storageUrl: page.storageUrl,
          })),
        })),
      }));
    }

    return sanitized;
  };

  const addProject = async (project: Project) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', project.id);
    await setDoc(projectRef, {
      ...sanitizeForFirestore(project) as Project,
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
      ...sanitizeForFirestore(data),
      updatedAt: new Date().toISOString()
    });
  };


  const deleteProject = async (projectId: string) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', projectId);
    const existing = projects.find(p => p.id === projectId);
    const isHacedor = user.uid === 'jhJUq4sUNDfFl78GNJRYn5CIFv02' || userData?.role === 'hacedor';
    
    if (existing?.deleted && isHacedor) {
      // Permanent delete
      await deleteDoc(projectRef);
    } else {
      // Soft delete
      await updateDoc(projectRef, {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user.uid,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const restoreProject = async (projectId: string) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date().toISOString()
    });
  };

  return { projects, loading, addProject, updateProject, deleteProject, restoreProject };
};
