import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as musicMetadata from 'music-metadata-browser';
import type { SongMetadata } from '../utils/db';
import { saveSong, getSongs, clearSongs, toggleSongFavorite, saveSetting, getSetting } from '../utils/db';

interface FileContextType {
  library: SongMetadata[];
  isScanning: boolean;
  permissionStatus: 'granted' | 'prompt' | 'denied';
  scanDirectory: () => Promise<void>;
  rescanAll: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  verifyLibrary: () => Promise<void>;
  getFileForSong: (song: SongMetadata) => Promise<File | null>;
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
      audio.src = url;
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  };

  const parseFile = async (file: File, fileHandle?: any): Promise<SongMetadata | null> => {
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
         addedAt: Date.now()
      };
    }
  };

  const processDirectory = async (dirHandle: any, newSongs: SongMetadata[]) => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        if (supportedExtensions.includes(ext)) {
          const file = await entry.getFile();
          const songMeta = await parseFile(file, entry);
          if (songMeta) {
            newSongs.push(songMeta);
            await saveSong(songMeta);
          }
        }
      } else if (entry.kind === 'directory') {
        await processDirectory(entry, newSongs);
      }
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
      const newSongs: SongMetadata[] = [];
      await processDirectory(dirHandle, newSongs);
      
      const allSaved = await getSongs();
      setLibrary(allSaved.sort((a, b) => b.addedAt - a.addedAt));
    } catch (err) {
      console.warn('Scan canceled or failed', err);
    } finally {
      setIsScanning(false);
    }
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

    // 2. Fetch from handle
    if (!song.fileHandle) return null;
    try {
      // NOTE: We don't call requestPermission here! 
      // It should have been granted at the directory level or previously.
      const file = await song.fileHandle.getFile();
      fileCache.set(song.id, file);
      return file;
    } catch (err) {
      console.error('Failed to get file from handle', err);
      // If we failed due to permission, we don't popup here.
      // The UI should show "Activate Library" based on permissionStatus.
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
      library, isScanning, permissionStatus, 
      scanDirectory, rescanAll, toggleFavorite, verifyLibrary, getFileForSong 
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
