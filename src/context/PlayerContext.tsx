import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { SongMetadata } from '../utils/db';
import { updateSongProgress, saveSong } from '../utils/db';
import { useFiles } from './FileContext';

interface PlayerContextType {
  queue: SongMetadata[];
  currentIndex: number;
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isBoosted: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  equalizerStyle: 'classic' | 'dots' | 'wave' | 'capsule' | 'mirror' | 'circular';
  playSong: (index: number, newQueue?: SongMetadata[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (time: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleBoost: () => void;
  setEqualizerStyle: (style: 'classic' | 'dots' | 'wave' | 'capsule' | 'mirror' | 'circular') => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { library, getFileForSong, permissionStatus } = useFiles();
  const [queue, setQueue] = useState<SongMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50); // 0-200 for booster
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [equalizerStyle, setEqualizerStyle] = useState<'classic' | 'dots' | 'wave' | 'capsule' | 'mirror' | 'circular'>('classic');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songRef = useRef<SongMetadata | null>(null);
  
  // Primary derived state for current song
  const currentSong = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Sync queue with library updates (for favorites, etc)
  useEffect(() => {
    if (queue.length > 0 && library.length > 0) {
      setQueue(prevQueue => prevQueue.map(qSong => {
        const libSong = library.find(ls => ls.id === qSong.id);
        if (libSong && (libSong.isFavorite !== qSong.isFavorite || libSong.title !== qSong.title)) {
          return { ...qSong, ...libSong };
        }
        return qSong;
      }));
    }
  }, [library]);

  // Sync songRef with currentSong
  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

  const isBoosted = volume > 100;

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      const newDuration = audio.duration;
      // Android/Chrome bug: duration might be Infinity or 0 for Blobs initially
      if (!isNaN(newDuration) && newDuration > 0 && newDuration !== Infinity) {
        setDuration(newDuration);
        
        const song = songRef.current;
        if (song && (song.duration === 0 || !song.duration)) {
          const updatedSong = { ...song, duration: newDuration };
          saveSong(updatedSong);
        }
      } else if (songRef.current?.duration) {
        // Fallback to DB duration for UI consistency on Android
        setDuration(songRef.current.duration);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.pause();
    };
  }, []);

  const nextSong = useCallback(() => {
    if (queue.length === 0) return;
    // 🚨 CRITICAL FIX: Unlock audio context
    if (audioRef.current) audioRef.current.play().catch(() => {});
    setCurrentIndex((prev) => {
      let next = prev + 1;
      if (next >= queue.length) {
        if (repeatMode === 'all') next = 0;
        else return prev;
      }
      return next;
    });
  }, [queue.length, repeatMode]);

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play();
    } else {
      nextSong();
    }
  }, [repeatMode, nextSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = handleEnded;
    }
  }, [handleEnded]);

  useEffect(() => {
    if (audioRef.current) {
      let actualVol = isMuted ? 0 : volume / 100;
      if (actualVol > 1) actualVol = 1;
      audioRef.current.volume = actualVol;
    }
  }, [volume, isMuted]);

  const loadAndPlayFile = async (song: SongMetadata) => {
    const audio = audioRef.current;
    if (!audio) return;

    // 1. Direct play from file reference
    const file = await getFileForSong(song);
    
    if (!file) {
      console.warn('Playback failed: No file access. Ensure the library is verified.');
      setIsPlaying(false);
      return;
    }

    try {
       // Revoke old URL to prevent memory leaks
       if (audio.src && audio.src.startsWith('blob:')) {
         URL.revokeObjectURL(audio.src);
       }

       const objectURL = URL.createObjectURL(file);
       audio.src = objectURL;
       
       // Explicitly load for Android reliability
       audio.load();
       
       if (song.lastProgress && song.lastProgress < song.duration - 2) {
          audio.currentTime = song.lastProgress;
          setProgress(song.lastProgress);
       } else {
          setProgress(0);
       }
       
       // Catch play promise to avoid unhandled rejection in background
       const playPromise = audio.play();
       if (playPromise !== undefined) {
         playPromise.catch(error => {
           console.error("Playback interrupted or failed", error);
           if (error.name === 'NotAllowedError') {
             console.log("Audio play blocked: needs user interaction context.");
             setIsPlaying(false);
           }
         });
       }
       setIsPlaying(true);
    } catch(e) {
       console.error("Playback failed setup", e);
       setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (currentSong) {
      loadAndPlayFile(currentSong);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentIndex]); 

  useEffect(() => {
    if (isPlaying && currentSong && progress > 5) {
      const interval = setInterval(() => {
        updateSongProgress(currentSong.id, progress);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSong, progress]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error('Resume failed', e));
      setIsPlaying(true);
    }
  };

  const playSong = (index: number, newQueue?: SongMetadata[]) => {
    // 🚨 CRITICAL FIX: Claim user gesture immediately
    if (audioRef.current) audioRef.current.play().catch(() => {});
    
    if (newQueue) {
      setQueue(newQueue);
    }
    setCurrentIndex(index);
  };

  const prevSong = () => {
    // 🚨 CRITICAL FIX: Unlock audio context
    if (audioRef.current) audioRef.current.play().catch(() => {});
    
    if (progress > 3) {
      seekTo(0);
      return;
    }
    if (queue.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 < 0 ? queue.length - 1 : prev - 1));
  };

  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const setVolumeLevel = (vol: number) => setVolume(Math.max(0, Math.min(200, vol)));
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleBoost = () => setVolume(v => v > 100 ? 50 : 150);
  
  const toggleRepeat = () => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  };

  return (
    <PlayerContext.Provider
      value={{
        queue, currentIndex, currentSong, isPlaying, progress, duration,
        volume, isMuted, isBoosted, repeatMode, isShuffle, equalizerStyle,
        playSong, togglePlay, nextSong, prevSong, seekTo,
        setVolumeLevel, toggleMute, toggleShuffle, toggleRepeat, toggleBoost, setEqualizerStyle
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
