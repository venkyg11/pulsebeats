import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { SongMetadata } from '../utils/db';
import { updateSongProgress, saveSong } from '../utils/db';
import { useFiles } from './FileContext';

type PlayErrorType = 'none' | 'blocked' | 'unsupported';

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
  playError: PlayErrorType;
  isBuffering: boolean;
  sleepTimer: number | null;
  playSong: (index: number, newQueue?: SongMetadata[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  nextSong: () => Promise<void>;
  prevSong: () => Promise<void>;
  seekTo: (time: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleBoost: () => void;
  setEqualizerStyle: (
    style: 'classic' | 'dots' | 'wave' | 'capsule' | 'mirror' | 'circular'
  ) => void;
  setSleepTimer: (minutes: number | null) => void;
  isBackgroundPlayEnabled: boolean;
  toggleBackgroundPlay: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { library, getFileForSong, toggleFavorite } = useFiles();

  const [queue, setQueue] = useState<SongMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [equalizerStyle, setEqualizerStyle] = useState<
    'classic' | 'dots' | 'wave' | 'capsule' | 'mirror' | 'circular'
  >('classic');
  const [playError, setPlayError] = useState<PlayErrorType>('none');
  const [isBuffering, setIsBuffering] = useState(false);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [isBackgroundPlayEnabled, setIsBackgroundPlayEnabled] = useState(true);

  const toggleBackgroundPlay = useCallback(() => setIsBackgroundPlayEnabled(p => !p), []);

  // Use refs securely to prevent duplicate unbindings/bindings inside Effects
  const queueRef = useRef<SongMetadata[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const songRef = useRef<SongMetadata | null>(null);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);

  // Safely initialize Audio object exactly once
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new Audio();
  }

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const objectUrlRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef(0);
  
  // Ref for debouncing and track transition locking
  const isTransitioningRef = useRef(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSong =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const isBoosted = volume > 100;

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { songRef.current = currentSong; }, [currentSong]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerState(null);
    } else {
      setSleepTimerState(Date.now() + minutes * 60 * 1000);
    }
  }, []);

  useEffect(() => {
    if (sleepTimer === null) return;
    
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimer) {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setSleepTimerState(null);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sleepTimer]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !isBackgroundPlayEnabled) {
        if (audioRef.current && isPlaying && !isTransitioningRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isBackgroundPlayEnabled, isPlaying]);

  useEffect(() => {
    if (queue.length > 0 && library.length > 0) {
      setQueue((prevQueue) =>
        prevQueue.map((qSong) => {
          const libSong = library.find((ls) => ls.id === qSong.id);
          if (
            libSong &&
            (libSong.isFavorite !== qSong.isFavorite ||
              libSong.title !== qSong.title ||
              libSong.artist !== qSong.artist ||
              libSong.album !== qSong.album)
          ) {
            return { ...qSong, ...libSong };
          }
          return qSong;
        })
      );
    }
  }, [library]);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const gain = ctx.createGain();
      
      if (audioRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(gain);
        sourceNodeRef.current = source;
      }
      
      gain.connect(ctx.destination);

      audioContextRef.current = ctx;
      gainNodeRef.current = gain;

      const vol = isMuted ? 0 : volume / 100;
      gain.gain.value = vol;
    } catch (err) {
      console.warn('AudioContext failed to initialize:', err);
    }
  }, [volume, isMuted]);

  const resumeAudioContext = useCallback(async () => {
    initAudioContext();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (err) {}
    }
  }, [initAudioContext]);

  // Robustly handle Audio events exactly once!
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime || 0);
    };

    const onLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) {
        setDuration(audio.duration);
        if (songRef.current && (!songRef.current.duration || songRef.current.duration === 0)) {
          saveSong({ ...songRef.current, duration: audio.duration });
        }
      } else if (songRef.current?.duration) {
        setDuration(songRef.current.duration);
      } else {
        setDuration(0);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setPlayError('none');
      setIsBuffering(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      // Ensure audio context is running to fix some weird BT desync issues
      if (audioContextRef.current?.state === 'suspended') {
         resumeAudioContext();
      }
    };

    const onPause = () => {
      // Don't update playing state if we are intentionally transitioning tracks
      if (!isTransitioningRef.current) {
        setIsPlaying(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      }
    };

    const onEnded = () => {
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {
           setPlayError('blocked');
           setIsPlaying(false);
        });
        return;
      }

      const q = queueRef.current;
      const idx = currentIndexRef.current;
      if (!q.length || idx < 0) {
        setIsPlaying(false);
        return;
      }

      let nextIndex = idx + 1;
      if (nextIndex >= q.length) {
        if (repeatModeRef.current === 'all') nextIndex = 0;
        else {
          setIsPlaying(false);
          return;
        }
      }

      const nextTrack = q[nextIndex];
      if (!nextTrack) {
        setIsPlaying(false);
        return;
      }

      setCurrentIndex(nextIndex);
      // Auto-next track without debouncing
      handleTrackSwitch(nextTrack);
    };

    const onError = () => {
      if (!isTransitioningRef.current) {
         setPlayError('unsupported');
         setIsPlaying(false);
         setIsBuffering(false);
      }
    };

    const onWaiting = () => {
      if (!isTransitioningRef.current) setIsBuffering(true);
    };
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      
      // DO NOT pause on unmount because this provider wraps the app
    };
  }, []); // Run only once to maintain stable handlers

  useEffect(() => {
    if (gainNodeRef.current) {
      const vol = isMuted ? 0 : volume / 100;
      gainNodeRef.current.gain.setTargetAtTime(vol, 0, 0.05);
      if (audioRef.current) audioRef.current.volume = Math.min(1.0, vol);
    } else if (audioRef.current) {
      let actualVol = isMuted ? 0 : volume / 100;
      if (actualVol > 1) actualVol = 1;
      if (actualVol < 0) actualVol = 0;
      audioRef.current.volume = actualVol;
    }
  }, [volume, isMuted]);

  const loadAndPlayFile = useCallback(
    async (song: SongMetadata, forcePlay = true): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;

      const requestId = ++loadRequestIdRef.current;

      setPlayError('none');
      setIsBuffering(true);

      if (song.isUnsupported) {
        setIsBuffering(false);
        setIsPlaying(false);
        setPlayError('unsupported');
        return;
      }

      try {
        const file = await getFileForSong(song);

        if (requestId !== loadRequestIdRef.current) return;

        if (!file) {
          setIsPlaying(false);
          setIsBuffering(false);
          setPlayError('unsupported');
          return;
        }

        // 1. Pause current track & reset hardware source mappings safely
        audio.pause();

        // Very important for Bluetooth clarity on Android/Chrome: 
        // Disconnecting Web Audio and reconnecting it cleans up the downstream pipeline.
        if (sourceNodeRef.current) {
          try { sourceNodeRef.current.disconnect(); } catch (e) {}
        }

        audio.removeAttribute('src');
        audio.src = '';
        audio.load(); // Flush buffers

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        // 2. Map new source
        const newObjectUrl = URL.createObjectURL(file);
        audio.preload = 'auto'; // Force buffer stream immediately
        objectUrlRef.current = newObjectUrl;
        audio.src = newObjectUrl;
        audio.load();

        if (sourceNodeRef.current && gainNodeRef.current) {
           sourceNodeRef.current.connect(gainNodeRef.current);
        }

        // 3. Wait strictly for loaded status before playing
        await new Promise<void>((resolve, reject) => {
          let resolved = false;

          const finish = () => {
             if (resolved) return;
             resolved = true;
             cleanup();
             resolve();
          };

          const checkReady = () => {
             // 3 means HAVE_FUTURE_DATA
             if (audio.readyState >= 3) {
                 finish();
             }
          };

          const onFail = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            reject(new Error('Audio load failed'));
          };

          const cleanup = () => {
            audio.removeEventListener('canplay', checkReady);
            audio.removeEventListener('canplaythrough', checkReady);
            audio.removeEventListener('error', onFail);
          };

          audio.addEventListener('canplay', checkReady);
          audio.addEventListener('canplaythrough', checkReady);
          audio.addEventListener('error', onFail);

          checkReady(); // check if already ready

          setTimeout(() => {
             finish(); // Timeout gracefully and try playing anyway
          }, 4000);
        });

        if (requestId !== loadRequestIdRef.current) return;

        // Reset positions
        if (song.lastProgress && song.lastProgress < (song.duration || 0) - 2) {
          audio.currentTime = song.lastProgress;
          setProgress(song.lastProgress);
        } else {
          audio.currentTime = 0;
          setProgress(0);
        }

        // 4. Safely Trigger Play
        if (forcePlay) {
          await resumeAudioContext();
          const playPromise = audio.play();
          if (playPromise !== undefined) {
             await playPromise;
          }
          setIsPlaying(true);
        }

      } catch (error: any) {
        if (requestId !== loadRequestIdRef.current) return;
        setIsPlaying(false);
        setPlayError(error?.name === 'NotAllowedError' ? 'blocked' : 'unsupported');
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsBuffering(false);
        }
      }
    },
    [getFileForSong, resumeAudioContext]
  );

  const handleTrackSwitch = useCallback(async (track: SongMetadata, forcePlay = true) => {
    isTransitioningRef.current = true;
    try {
      await loadAndPlayFile(track, forcePlay);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [loadAndPlayFile]);

  const playSong = useCallback(
    async (index: number, newQueue?: SongMetadata[]) => {
      await resumeAudioContext();
      
      const targetQueue = newQueue ?? queueRef.current;
      const targetSong = targetQueue[index];

      if (!targetSong) return;

      if (newQueue) {
        setQueue(newQueue);
        queueRef.current = newQueue;
      }

      setCurrentIndex(index);
      songRef.current = targetSong;

      // Wrap in transition lock
      await handleTrackSwitch(targetSong, true);
    },
    [handleTrackSwitch, resumeAudioContext]
  );

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    const song = songRef.current;

    await resumeAudioContext();

    if (!audio || !song) return;

    // Prevent toggle while actively loading
    if (isTransitioningRef.current) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!audio.src) {
      await handleTrackSwitch(song, true);
      return;
    }

    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      setIsPlaying(true);
      setPlayError('none');
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') setPlayError('blocked');
      else setPlayError('unsupported');
      setIsPlaying(false);
    }
  }, [isPlaying, handleTrackSwitch, resumeAudioContext]);

  const nextSong = useCallback(async () => {
    await resumeAudioContext();

    // Debounce to block rapid successive tap corruption
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      const q = queueRef.current;
      if (!q.length) return;

      const current = currentIndexRef.current;
      let nextIdx = current + 1;

      if (isShuffleRef.current && q.length > 1) {
        nextIdx = Math.floor(Math.random() * q.length);
        while (nextIdx === current) {
          nextIdx = Math.floor(Math.random() * q.length);
        }
      } else if (nextIdx >= q.length) {
        nextIdx = repeatModeRef.current === 'all' ? 0 : current;
      }

      if (nextIdx === current && repeatModeRef.current === 'off' && !isShuffleRef.current) return;

      const nextTrack = q[nextIdx];
      if (nextTrack) {
         setCurrentIndex(nextIdx);
         songRef.current = nextTrack;
         await handleTrackSwitch(nextTrack);
      }
    }, 150);
  }, [resumeAudioContext, handleTrackSwitch]);

  const prevSong = useCallback(async () => {
    await resumeAudioContext();

    if (progress > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      const q = queueRef.current;
      if (!q.length) return;

      const current = currentIndexRef.current;
      const prevIdx = current - 1 < 0 ? q.length - 1 : current - 1;
      const prevTrack = q[prevIdx];

      if (prevTrack) {
         setCurrentIndex(prevIdx);
         songRef.current = prevTrack;
         await handleTrackSwitch(prevTrack);
      }
    }, 150);
  }, [progress, resumeAudioContext, handleTrackSwitch]);

  useEffect(() => {
    if (isPlaying && currentSong && progress > 5) {
      const interval = setInterval(() => {
        updateSongProgress(currentSong.id, progress);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSong, progress]);

  const seekTo = (time: number) => {
    if (audioRef.current && !isTransitioningRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const setVolumeLevel = (vol: number) => setVolume(Math.max(0, Math.min(200, vol)));
  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleShuffle = () => setIsShuffle((prev) => !prev);
  const toggleBoost = () => setVolume((v) => (v > 100 ? 50 : 150));
  const toggleRepeat = () => setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  const setEq = (style: typeof equalizerStyle) => setEqualizerStyle(style);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: currentSong.coverArt ? [
          { src: currentSong.coverArt, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });
    }

    const handleSeekForward = () => {
      if (currentSong) toggleFavorite(currentSong.id);
    };

    navigator.mediaSession.setActionHandler('play', async () => {
      await resumeAudioContext();
      if (audioRef.current) audioRef.current.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    navigator.mediaSession.setActionHandler('seekforward', handleSeekForward);

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [currentSong, prevSong, nextSong, resumeAudioContext, toggleFavorite]);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentIndex,
        currentSong,
        isPlaying,
        progress,
        duration,
        volume,
        isMuted,
        isBoosted,
        repeatMode,
        isShuffle,
        equalizerStyle,
        playError,
        isBuffering,
        sleepTimer,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        seekTo,
        setVolumeLevel,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        toggleBoost,
        setEqualizerStyle: setEq,
        setSleepTimer,
        isBackgroundPlayEnabled,
        toggleBackgroundPlay,
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