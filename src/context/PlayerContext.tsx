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
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [equalizerStyle, setEqualizerStyle] = useState<'classic' | 'dots' | 'wave' | 'capsule' | 'mirror' | 'circular'>('classic');
  const [playError, setPlayError] = useState<'none' | 'blocked' | 'unsupported'>('none');

  // Single persistent audio element
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const songRef = useRef<SongMetadata | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  
  const currentSong = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

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

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

  const isBoosted = volume > 100;

  // Initialize audio listeners once
  useEffect(() => {
    const audio = audioRef.current;
    
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) {
        setDuration(audio.duration);
        if (songRef.current && (!songRef.current.duration || songRef.current.duration === 0)) {
          saveSong({ ...songRef.current, duration: audio.duration });
        }
      } else if (songRef.current?.duration) {
        setDuration(songRef.current.duration);
      }
    };

    const onError = () => {
      console.error("Audio error code:", audio.error?.code);
      setPlayError('unsupported');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const loadAndPlayFile = useCallback(async (song: SongMetadata) => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlayError('none');
    const file = await getFileForSong(song);
    
    if (!file) {
      console.warn('Playback failed: No file access.');
      setIsPlaying(false);
      return;
    }

    // Check support
    if (audio.canPlayType(file.type) === '') {
      console.warn('Format might not be supported:', file.type);
    }

    try {
       // Pause current to ensure clean transition
       audio.pause();
       
       const objectURL = URL.createObjectURL(file);
       
       // Handle memory: Revoke OLD url only AFTER setting new one, 
       // but user said "Do NOT revoke early". We'll keep a reference to revoke when changing next.
       const oldUrl = objectUrlRef.current;
       objectUrlRef.current = objectURL;
       
       audio.src = objectURL;
       audio.load();

       // Android requirement: user gesture often needed here if not already "unlocked"
       // We wait for canplay to ensure we don't play too early
       return new Promise<void>((resolve, reject) => {
         const onCanPlay = async () => {
           audio.removeEventListener('canplay', onCanPlay);
           
           if (song.lastProgress && song.lastProgress < (song.duration || 0) - 2) {
             audio.currentTime = song.lastProgress;
             setProgress(song.lastProgress);
           } else {
             setProgress(0);
           }

           try {
             await audio.play();
             setIsPlaying(true);
             setPlayError('none');
             
             // Now it's safe to revoke the old URL if it exists
             if (oldUrl && oldUrl.startsWith('blob:')) {
               URL.revokeObjectURL(oldUrl);
             }
             resolve();
           } catch (error: any) {
             console.error("Play failed:", error.name, error.message);
             if (error.name === 'NotAllowedError') {
               setPlayError('blocked');
             } else {
               setPlayError('unsupported');
             }
             setIsPlaying(false);
             reject(error);
           }
         };
         
         audio.addEventListener('canplay', onCanPlay);
         
         // Fallback if canplay takes too long
         setTimeout(() => {
           audio.removeEventListener('canplay', onCanPlay);
           reject(new Error('Timeout waiting for canplay'));
         }, 10000);
       });
    } catch(e) {
       console.error("Playback setup failed", e);
       setIsPlaying(false);
    }
  }, [getFileForSong]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        setPlayError('none');
      } catch (error: any) {
        console.error('Resume failed', error);
        if (error.name === 'NotAllowedError') {
          setPlayError('blocked');
        }
      }
    }
  }, [isPlaying, currentSong]);

  const playSong = useCallback((index: number, newQueue?: SongMetadata[]) => {
    // 🚨 Claim user gesture immediately by trying to play. 
    // Even if it fails, it flags the audio element as having been touched by a gesture.
    audioRef.current.play().catch(() => {});
    
    if (newQueue) {
      setQueue(newQueue);
    }
    setCurrentIndex(index);
  }, []);

  const nextSong = useCallback(() => {
    if (queue.length === 0) return;
    audioRef.current.play().catch(() => {});
    setCurrentIndex((prev) => {
      let next = prev + 1;
      if (next >= queue.length) {
        if (repeatMode === 'all') next = 0;
        else return prev;
      }
      return next;
    });
  }, [queue.length, repeatMode]);

  const prevSong = useCallback(() => {
    audioRef.current.play().catch(() => {});
    if (progress > 3) {
      seekTo(0);
      return;
    }
    if (queue.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 < 0 ? queue.length - 1 : prev - 1));
  }, [progress, queue.length]);

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setPlayError('blocked'));
    } else {
      nextSong();
    }
  }, [repeatMode, nextSong]);

  useEffect(() => {
    audioRef.current.onended = handleEnded;
  }, [handleEnded]);

  useEffect(() => {
    let actualVol = isMuted ? 0 : volume / 100;
    if (actualVol > 1) actualVol = 1;
    audioRef.current.volume = actualVol;
  }, [volume, isMuted]);

  // Main effect to handle song changes
  useEffect(() => {
    if (currentSong) {
      loadAndPlayFile(currentSong);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentIndex, loadAndPlayFile]); 

  useEffect(() => {
    if (isPlaying && currentSong && progress > 5) {
      const interval = setInterval(() => {
        updateSongProgress(currentSong.id, progress);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSong, progress]);

  const seekTo = (time: number) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const setVolumeLevel = (vol: number) => setVolume(Math.max(0, Math.min(200, vol)));
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleBoost = () => setVolume(v => v > 100 ? 50 : 150);
  const toggleRepeat = () => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  const setEq = (style: typeof equalizerStyle) => setEqualizerStyle(style);

  return (
    <PlayerContext.Provider
      value={{
        queue, currentIndex, currentSong, isPlaying, progress, duration,
        volume, isMuted, isBoosted, repeatMode, isShuffle, equalizerStyle,
        playSong, togglePlay, nextSong, prevSong, seekTo,
        setVolumeLevel, toggleMute, toggleShuffle, toggleRepeat, toggleBoost, setEqualizerStyle: setEq,
        // @ts-ignore - exposing playError for UI
        playError, 
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
