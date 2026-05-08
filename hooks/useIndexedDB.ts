
import React, { useState, useEffect } from 'react';

const DB_NAME = 'ProjectAnalyticaDB';
const STORE_NAME = 'keyValueStore';
const DB_VERSION = 1;

// Singleton promise to ensure DB is opened only once.
const dbPromise: Promise<IDBDatabase> = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
    };
});


function useIndexedDB<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Effect to load data from IndexedDB on initial render
  useEffect(() => {
    let isMounted = true;
    dbPromise.then(db => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.warn(`Object store ${STORE_NAME} not found. Can't retrieve value for key ${key}.`);
          if(isMounted) setStoredValue(initialValue);
          return;
      }
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        if (isMounted) {
          const valueFromDb = getRequest.result;
          setStoredValue(valueFromDb !== undefined ? valueFromDb : initialValue);
        }
      };
       getRequest.onerror = () => {
          console.error(`Error fetching '${key}' from IndexedDB:`, getRequest.error);
          if (isMounted) setStoredValue(initialValue); // Fallback
       }
    }).catch(error => {
        console.error("Failed to open DB for reading:", error);
        if (isMounted) setStoredValue(initialValue); // Fallback
    });

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        dbPromise.then(db => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const putRequest = store.put(valueToStore, key);
            putRequest.onerror = () => {
                console.error(`Error writing '${key}' to IndexedDB:`, putRequest.error);
            };
        }).catch(error => console.error("Failed to open DB for writing:", error));
    } catch (error) {
        console.error("Error in setValue for useIndexedDB:", error);
    }
  };

  return [storedValue, setValue];
}

export default useIndexedDB;
