import { openDB } from 'idb';
import { Note } from '../types';

const DB_NAME = 'zettelkasten';
const STORE_NAME = 'notes';

export const getDb = () =>
  openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });

export const getAllNotes = async (): Promise<Note[]> => {
  const db = await getDb();
  const notes = await db.getAll(STORE_NAME);
  return notes.map(n => ({
    ...n,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }));
};

export const saveNotes = async (notes: Note[]) => {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  for (const note of notes) {
    await tx.objectStore(STORE_NAME).put(note);
  }
  await tx.done;
};
