import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadFile = async (userId: string, projectId: string, file: File): Promise<string> => {
  const fileRef = ref(storage, `users/${userId}/projects/${projectId}/files/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

export const uploadBase64Image = async (userId: string, projectId: string, fileName: string, base64: string, mimeType: string): Promise<string> => {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryData = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  
  const fileRef = ref(storage, `users/${userId}/projects/${projectId}/images/${fileName}`);
  const snapshot = await uploadBytes(fileRef, uint8Array, { contentType: mimeType });
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};
