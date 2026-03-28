import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as musicMetadata from 'music-metadata-browser';
import type { SongMetadata } from '../utils/db';
import { saveSongs, getSongs, clearSongs, toggleSongFavorite, saveSetting, getSetting, getSongById } from '../utils/db';

interface FileContextType {
  library: SongMetadata[];
  isScanning: boolean;
  permissionStatus: 'granted' | 'prompt' | 'denied';
  scanDirectory: () => Promise<void>;
  rescanAll: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  verifyLibrary: () => Promise<void>;
  getFileForSong: (song: SongMetadata) => Promise<File | null>;
  handleManualFileSelect: (files: FileList) => Promise<void>;
  isFileSystemApiSupported: boolean;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

const supportedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];

// Session cache for File objects to avoid repeated permission prompts
const fileCache = new Map<string, File>();

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [library, setLibrary] = useState<SongMetadata[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  const [rootHandle, setRootHandle] = useState<any>(null);
  
  const isFileSystemApiSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const loadSaved = useCallback(async () => {
    const saved = await getSongs();
    const storedHandle = await getSetting('library_root_handle');
    
    if (storedHandle) {
      setRootHandle(storedHandle);
      // Check permission status
      const status = await storedHandle.queryPermission({ mode: 'read' });
      setPermissionStatus(status);
    }
    
    setLibrary(saved.sort((a, b) => b.addedAt - a.addedAt));
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const verifyLibrary = async () => {
    if (!rootHandle) return;
    try {
      const status = await rootHandle.requestPermission({ mode: 'read' });
      setPermissionStatus(status);
    } catch (err) {
      console.error('Permission request failed', err);
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      // Set a timeout to prevent hanging on Android if metadata never loads
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(0);
      }, 4000); // 4s for Android metadata patience

      audio.src = url;
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        // 🚨 CRITICAL Android/Chrome SEEK-HACK: 
        // Force the browser to find the end of the Blob by seeking to Infinity!
        if (audio.duration === Infinity || isNaN(audio.duration) || audio.duration === 0) {
          audio.currentTime = 1e101;
          audio.ontimeupdate = () => {
            audio.ontimeupdate = null;
            clearTimeout(timeout);
            const finalDuration = audio.duration;
            URL.revokeObjectURL(url);
            resolve(finalDuration === Infinity ? 0 : finalDuration || 0);
          };
        } else {
          clearTimeout(timeout);
          const duration = audio.duration;
          URL.revokeObjectURL(url);
          resolve(duration || 0);
        }
      };
      
      audio.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  };

  const parseFile = async (file: File, fileHandle?: any, shouldStoreBlob = false): Promise<SongMetadata | null> => {
    try {
      const metadata = await musicMetadata.parseBlob(file);
      
      let duration = metadata.format.duration || 0;
      if (duration === 0) {
        duration = await getAudioDuration(file);
      }
      let coverArt = '';
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const pic = metadata.common.picture[0];
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        const base64String = await new Promise<string>((resolve, reject) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve(reader.result as string);
           reader.onerror = reject;
           reader.readAsDataURL(blob);
        });
        coverArt = base64String;
      }

      return {
        id: file.name + '-' + file.size,
        title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        duration,
        fileName: file.name,
        fileHandle,
        fileBlob: shouldStoreBlob ? file : undefined,
        coverArt,
        addedAt: Date.now()
      };
    } catch (e) {
      const duration = await getAudioDuration(file);
      return {
         id: file.name + '-' + file.size,
         title: file.name.replace(/\.[^/.]+$/, ''),
         artist: 'Unknown Artist',
         album: 'Unknown Album',
         duration,
         fileName: file.name,
         fileHandle,
         fileBlob: shouldStoreBlob ? file : undefined,
         addedAt: Date.now()
      };
    }
  };

  const processFile = async (file: File, fileHandle: any, newSongs: SongMetadata[], shouldStoreBlob = false) => {
    const songId = `${file.name}-${file.size}`;
    
    // Skip if already in database
    const existing = await getSongById(songId);
    if (existing) return;

    let targetFile = file;
    if (shouldStoreBlob) {
      // 🚨 CRITICAL FIX: Android PWAs lose standard <input> File references.
      // We MUST copy the literal byte data into a new, raw memory Blob so IDB doesn't store a ghost path.
      try {
        const buffer = await file.arrayBuffer();
        targetFile = new Blob([buffer], { type: file.type || 'audio/mpeg' }) as File;
        // Keep the original name for metadata fallback
        Object.defineProperty(targetFile, 'name', { value: file.name });
        Object.defineProperty(targetFile, 'size', { value: file.size });
      } catch (err) {
        console.warn('Failed to deep-copy file to ArrayBuffer, falling back to weak reference.', err);
      }
    }

    const songMeta = await parseFile(targetFile, fileHandle, shouldStoreBlob);
    if (songMeta) {
      newSongs.push(songMeta);
    }
  };

  const scanDirectory = async () => {
    try {
      // @ts-ignore - native API
      const dirHandle = await window.showDirectoryPicker();
      await saveSetting('library_root_handle', dirHandle);
      setRootHandle(dirHandle);
      setPermissionStatus('granted');
      
      setIsScanning(true);
      const allFileEntries: any[] = [];
      
      // 1. Discover all files first (fast)
      const discoverFiles = async (handle: any) => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const ext = entry.name.split('.').pop()?.toLowerCase() || '';
            if (supportedExtensions.includes(ext)) {
              allFileEntries.push(entry);
            }
          } else if (entry.kind === 'directory') {
            await discoverFiles(entry);
          }
        }
      };
      
      await discoverFiles(dirHandle);

      // 2. Process files in parallel with concurrency limit
      const CONCURRENCY_LIMIT = 10;
      const BATCH_SIZE = 20;
      const newSongs: SongMetadata[] = [];
      
      for (let i = 0; i < allFileEntries.length; i += CONCURRENCY_LIMIT) {
        const batch = allFileEntries.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(batch.map(async (entry) => {
          const file = await entry.getFile();
          return processFile(file, entry, newSongs, false);
        }));
        
        // Periodic save to DB and UI update for large collections
        if (newSongs.length >= BATCH_SIZE) {
          await saveSongs([...newSongs]);
          const currentSongs = await getSongs();
          setLibrary(currentSongs.sort((a, b) => b.addedAt - a.addedAt));
          newSongs.length = 0; // Clear the batch array but keep the reference
        }
      }

      // Final save for any remaining songs
      if (newSongs.length > 0) {
        await saveSongs(newSongs);
      }
      
      const allSaved = await getSongs();
      setLibrary(allSaved.sort((a, b) => b.addedAt - a.addedAt));
    } catch (err) {
      console.warn('Scan canceled or failed', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualFileSelect = async (files: FileList) => {
    setIsScanning(true);
    const newSongs: SongMetadata[] = [];
    const BATCH_SIZE = 5; // Smaller batch save for mobile stability
    const audioFiles = Array.from(files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return supportedExtensions.includes(ext);
    });

    // 🚨 SEQUENTIAL PROCESSING:
    // Processing 170+ files in parallel with `arrayBuffer()` crashes Android memory.
    // We MUST process them one-by-one to ensure stability.
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      await processFile(file, null, newSongs, true); // shouldStoreBlob = true

      if (newSongs.length >= BATCH_SIZE || i === audioFiles.length - 1) {
        await saveSongs([...newSongs]);
        const currentSongs = await getSongs();
        setLibrary(currentSongs.sort((a, b) => b.addedAt - a.addedAt));
        newSongs.length = 0;
      }
    }
    setIsScanning(false);
  };

  const rescanAll = async () => {
    setIsScanning(true);
    await clearSongs();
    await saveSetting('library_root_handle', null);
    setRootHandle(null);
    setPermissionStatus('prompt');
    setLibrary([]);
    setIsScanning(false);
  };

  const getFileForSong = async (song: SongMetadata): Promise<File | null> => {
    // 1. Check session cache
    if (fileCache.has(song.id)) {
      return fileCache.get(song.id)!;
    }

    // 2. Check for stored blob (Fallback/Mobile mode)
    if (song.fileBlob) {
      fileCache.set(song.id, song.fileBlob);
      return song.fileBlob;
    }

    // 3. Fetch from handle (FS API mode)
    if (!song.fileHandle) return null;
    try {
      const file = await song.fileHandle.getFile();
      fileCache.set(song.id, file);
      return file;
    } catch (err) {
      console.error('Failed to get file from handle', err);
      return null;
    }
  };

  const toggleFavorite = async (id: string) => {
    const isFav = await toggleSongFavorite(id);
    setLibrary(prev => prev.map(song => 
      song.id === id ? { ...song, isFavorite: isFav } : song
    ));
  };

  return (
    <FileContext.Provider value={{ 
      library, isScanning, permissionStatus, isFileSystemApiSupported,
      scanDirectory, rescanAll, toggleFavorite, verifyLibrary, getFileForSong, handleManualFileSelect 
    }}>
      {children}
    </FileContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error('useFiles must be used within FileProvider');
  return context;
};
