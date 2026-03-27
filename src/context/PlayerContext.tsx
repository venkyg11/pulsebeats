import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { SongMetadata } from '../utils/db';
import { updateSongProgress } from '../utils/db';

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
  const currentSong = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const isBoosted = volume > 100;

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMeta);
    
    return () => {
      audioRef.current?.pause();
      audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current?.removeEventListener('ended', handleEnded);
      audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMeta);
    };
  // eslint-disable-next-line
  }, []);

  const handleTimeUpdate = () => {
    if (audioRef.current) setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMeta = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play();
    } else {
      nextSong();
    }
  // eslint-disable-next-line
  }, [repeatMode]);

  useEffect(() => {
    if (audioRef.current) {
      handleEndedRef.current = handleEnded;
      audioRef.current.onended = () => handleEndedRef.current();
    }
  }, [handleEnded]);
  
  const handleEndedRef = useRef(handleEnded);

  useEffect(() => {
    if (audioRef.current) {
      let actualVol = isMuted ? 0 : volume / 100;
      // For booster (volume > 100), native audio API tops at 1.0
      // Implementing real audio gain booster requires Web Audio API.
      // For simplicity/safety, we visually boost it, and cap native to 1.
      if (actualVol > 1) actualVol = 1;
      audioRef.current.volume = actualVol;
    }
  }, [volume, isMuted]);

  // Handle actual file request
  const loadAndPlayFile = async (song: SongMetadata) => {
    if (!song.fileHandle) return;
    try {
       const isVerif = await song.fileHandle.requestPermission({ mode: 'read' });
       if (isVerif !== 'granted') return;
       const file = await song.fileHandle.getFile();
       const objectURL = URL.createObjectURL(file);
       if (audioRef.current) {
         audioRef.current.src = objectURL;
         
         // Resume if possible
         if (song.lastProgress && song.lastProgress < song.duration - 2) {
            audioRef.current.currentTime = song.lastProgress;
            setProgress(song.lastProgress);
         } else {
            setProgress(0);
         }
         
         audioRef.current.play();
         setIsPlaying(true);
       }
    } catch(e) {
       console.error("Failed to load/play file", e);
    }
  };

  useEffect(() => {
    if (currentSong) {
      setProgress(0);
      loadAndPlayFile(currentSong);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentIndex]); // Only on index change, not currentSong deep equal

  // Persist progress periodically
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
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const playSong = (index: number, newQueue?: SongMetadata[]) => {
    if (newQueue) {
      setQueue(newQueue);
    }
    setCurrentIndex(index);
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  };

  const nextSong = () => {
    if (queue.length === 0) return;
    setCurrentIndex((prev) => {
      let next = prev + 1;
      if (next >= queue.length) {
        if (repeatMode === 'all') next = 0;
        else return prev; // Stop playing
      }
      return next;
    });
  };

  const prevSong = () => {
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
