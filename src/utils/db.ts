import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface SongMetadata {
  id: string; // unique ID generated from file name + size or just random UUID
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverArt?: string; // base64 string
  fileName: string;
  fileHandle?: any; // FileSystemFileHandle or similar reference
  addedAt: number;
  lastProgress?: number; 
  lastPlayedAt?: number;
  playCount?: number;
  isFavorite?: boolean;
}

interface PulseBeatsDB extends DBSchema {
  songs: {
    key: string;
    value: SongMetadata;
    indexes: {
      'by-added': number;
      'by-artist': string;
      'by-album': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<PulseBeatsDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<PulseBeatsDB>('pulse-beats-db', 2, {
      upgrade(db: IDBPDatabase<PulseBeatsDB>, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('songs', { keyPath: 'id' });
          store.createIndex('by-added', 'addedAt');
          store.createIndex('by-artist', 'artist');
          store.createIndex('by-album', 'album');
        }
        if (oldVersion < 2) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
};

export const saveSong = async (song: SongMetadata) => {
  const db = await initDB();
  await db.put('songs', song);
};

export const getSongs = async (): Promise<SongMetadata[]> => {
  const db = await initDB();
  return await db.getAllFromIndex('songs', 'by-added');
};

export const deleteSong = async (id: string) => {
  const db = await initDB();
  await db.delete('songs', id);
};

export const clearSongs = async () => {
  const db = await initDB();
  await db.clear('songs');
};

export const updateSongProgress = async (id: string, progress: number) => {
  const db = await initDB();
  const song = await db.get('songs', id);
  if (song) {
    song.lastProgress = progress;
    song.lastPlayedAt = Date.now();
    song.playCount = (song.playCount || 0) + 1;
    await db.put('songs', song);
  }
};

export const toggleSongFavorite = async (id: string) => {
  const db = await initDB();
  const song = await db.get('songs', id);
  if (song) {
    song.isFavorite = !song.isFavorite;
    await db.put('songs', song);
    return song.isFavorite;
  }
  return false;
};

export const saveSetting = async (key: string, value: any) => {
  const db = await initDB();
  await db.put('settings', value, key);
};

export const getSetting = async (key: string): Promise<any> => {
  const db = await initDB();
  return await db.get('settings', key);
};
