import React, { createContext, useContext, useState, useEffect } from 'react';
import * as musicMetadata from 'music-metadata-browser';
import type { SongMetadata } from '../utils/db';
import { saveSong, getSongs, clearSongs, toggleSongFavorite } from '../utils/db';

interface FileContextType {
  library: SongMetadata[];
  isScanning: boolean;
  scanDirectory: () => Promise<void>;
  rescanAll: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

const supportedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [library, setLibrary] = useState<SongMetadata[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Load from IndexedDB on startup
    const loadSaved = async () => {
      const saved = await getSongs();
      setLibrary(saved.sort((a, b) => b.addedAt - a.addedAt));
    };
    loadSaved();
  }, []);

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
        // Generate blob URL, wait... we shouldn't save giant base64 strings if we have tons of files.
        // It's better to store blob arrays in IndexedDB or base64. idb supports Blobs.
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
        fileHandle, // Save the handle so we can request permission later if needed
        coverArt,
        addedAt: Date.now()
      };
    } catch (e) {
      console.error('Failed to parse', file.name, e);
      // Fallback
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
    setLibrary([]);
    setIsScanning(false);
  };

  const toggleFavorite = async (id: string) => {
    const isFav = await toggleSongFavorite(id);
    setLibrary(prev => prev.map(song => 
      song.id === id ? { ...song, isFavorite: isFav } : song
    ));
  };

  return (
    <FileContext.Provider value={{ library, isScanning, scanDirectory, rescanAll, toggleFavorite }}>
      {children}
    </FileContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error('useFiles must be used within FileProvider');
  return context;
};
