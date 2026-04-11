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
        audioRef.current.pause();
        setIsPlaying(false);
        setSleepTimerState(null);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sleepTimer]);

  useEffect(() => {
    const handleVisibility = () => {
      // Pause if background play is disabled and user switches away from the app
      if (document.hidden && !isBackgroundPlayEnabled) {
        if (audioRef.current && isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isBackgroundPlayEnabled, isPlaying]);


  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const objectUrlRef = useRef<string | null>(null);
  const songRef = useRef<SongMetadata | null>(null);
  const queueRef = useRef<SongMetadata[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const loadRequestIdRef = useRef(0);

  const currentSong =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const isBoosted = volume > 100;

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

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
  }, [library, queue.length]);

  useEffect(() => {
    const audio = audioRef.current;

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
    };

    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };

    const onEnded = async () => {
      if (repeatMode === 'one') {
        try {
          audio.currentTime = 0;
          await audio.play();
        } catch (error: any) {
          if (error?.name === 'NotAllowedError') {
            setPlayError('blocked');
          } else {
            setPlayError('unsupported');
          }
          setIsPlaying(false);
        }
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
        if (repeatMode === 'all') nextIndex = 0;
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
      try {
        await loadAndPlayFile(nextTrack, true);
      } catch {
        // handled inside loadAndPlayFile
      }
    };

    const onError = () => {
      console.error('Audio error code:', audio.error?.code, audio.error?.message);
      setPlayError('unsupported');
      setIsPlaying(false);
      setIsBuffering(false);
    };

    const onWaiting = () => setIsBuffering(true);
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
      audio.pause();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [repeatMode]);

  useEffect(() => {
    if (gainNodeRef.current) {
      const vol = isMuted ? 0 : volume / 100;
      // Use exponential ramp for smoother volume changes
      gainNodeRef.current.gain.setTargetAtTime(vol, 0, 0.05);
      // Still set the audio volume as fallback, but cap it at 1.0
      audioRef.current.volume = Math.min(1.0, vol);
    } else {
      let actualVol = isMuted ? 0 : volume / 100;
      if (actualVol > 1) actualVol = 1;
      if (actualVol < 0) actualVol = 0;
      audioRef.current.volume = actualVol;
    }
  }, [volume, isMuted]);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const gain = ctx.createGain();
      const source = ctx.createMediaElementSource(audioRef.current);

      source.connect(gain);
      gain.connect(ctx.destination);

      audioContextRef.current = ctx;
      gainNodeRef.current = gain;
      sourceNodeRef.current = source;

      // Initialize volume
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
      } catch (err) {
        console.warn('Failed to resume AudioContext:', err);
      }
    }
  }, [initAudioContext]);

  const cleanupOldObjectUrl = useCallback((excludeUrl?: string | null) => {
    const existing = objectUrlRef.current;
    if (existing && existing !== excludeUrl && existing.startsWith('blob:')) {
      URL.revokeObjectURL(existing);
      objectUrlRef.current = null;
    }
  }, []);

  const loadAndPlayFile = useCallback(
    async (song: SongMetadata, forcePlay = true, isRetry = false): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;

      const requestId = ++loadRequestIdRef.current;
      setPlayError('none');
      setIsBuffering(true);

      // Pre-flight check: If file is marked unsupported during scan, reject immediately.
      if (song.isUnsupported) {
        setIsBuffering(false);
        setIsPlaying(false);
        setPlayError('unsupported');
        return;
      }

      try {
        const file = await getFileForSong(song);

        if (!file) {
          console.warn('Playback failed: no file returned for song');
          setIsPlaying(false);
          setIsBuffering(false);
          setPlayError('unsupported');
          return;
        }

        const mimeType = file.type || '';
        if (mimeType && audio.canPlayType(mimeType) === '') {
          console.warn('Format may not be supported on this device:', mimeType);
        }

        const newObjectUrl = URL.createObjectURL(file);
        const previousUrl = objectUrlRef.current;

        audio.pause();
        audio.preload = 'auto'; // Android: high priority loading
        objectUrlRef.current = newObjectUrl;
        audio.src = newObjectUrl;
        audio.load();

        await new Promise<void>((resolve, reject) => {
          let finished = false;
          const cleanup = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onLoadError);
          };
          const onCanPlay = () => {
            if (finished) return;
            finished = true;
            cleanup();
            resolve();
          };
          const onLoadError = () => {
            if (finished) return;
            finished = true;
            cleanup();
            reject(new Error('Audio failed to load'));
          };
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('error', onLoadError, { once: true });
          setTimeout(() => {
            if (finished) return;
            finished = true;
            cleanup();
            resolve(); // Resolve anyway on timeout to try playing
          }, 6000);
        });

        if (requestId !== loadRequestIdRef.current) {
          URL.revokeObjectURL(newObjectUrl);
          return;
        }

        if (song.lastProgress && song.lastProgress < (song.duration || 0) - 2) {
          audio.currentTime = song.lastProgress;
          setProgress(song.lastProgress);
        } else {
          audio.currentTime = 0;
          setProgress(0);
        }

        if (forcePlay) {
          await resumeAudioContext();
          try {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              await playPromise;
            }
            setIsPlaying(true);
            setPlayError('none');
          } catch (error: any) {
            console.error('Play failed:', error?.name, error?.message);
            if (error?.name === 'NotAllowedError') {
              setPlayError('blocked');
              console.log('📢 Android Playback: Blocked until user tap.');
            } else if (!isRetry) {
              console.warn('Playback failed. Recreating ObjectURL and retrying once...');
              audio.pause();
              audio.src = '';
              if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
              }
              // Immediately retry once. The recursive call will hit the !isRetry check if it fails again.
              return loadAndPlayFile(song, forcePlay, true);
            } else {
              setPlayError('unsupported');
            }
            setIsPlaying(false);
          }
        }

        if (previousUrl && previousUrl !== newObjectUrl && previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }
      } catch (error: any) {
        console.error('Playback setup failed:', error);
        setIsPlaying(false);
        setIsBuffering(false);
        setPlayError(error?.name === 'NotAllowedError' ? 'blocked' : 'unsupported');
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsBuffering(false);
        }
      }
    },
    [getFileForSong, resumeAudioContext]
  );

  const playSong = useCallback(
    async (index: number, newQueue?: SongMetadata[]) => {
      // Direct user gesture chain
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

      await loadAndPlayFile(targetSong, true);
    },
    [loadAndPlayFile, resumeAudioContext]
  );

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    const song = songRef.current;

    await resumeAudioContext();

    if (!audio || !song) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!audio.src) {
      await loadAndPlayFile(song, true);
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
      console.error('Resume failed:', error);
      if (error?.name === 'NotAllowedError') {
        setPlayError('blocked');
      } else {
        setPlayError('unsupported');
      }
      setIsPlaying(false);
    }
  }, [isPlaying, loadAndPlayFile, resumeAudioContext]);

  const nextSong = useCallback(async () => {
    await resumeAudioContext();
    const q = queueRef.current;
    if (!q.length) return;

    const current = currentIndexRef.current;
    let nextIdx = current + 1;

    if (isShuffle && q.length > 1) {
      nextIdx = Math.floor(Math.random() * q.length);
      while (nextIdx === current) {
        nextIdx = Math.floor(Math.random() * q.length);
      }
    } else if (nextIdx >= q.length) {
      nextIdx = repeatMode === 'all' ? 0 : current;
    }

    if (nextIdx === current && repeatMode === 'off' && !isShuffle) return;

    const nextTrack = q[nextIdx];
    if (nextTrack) {
       setCurrentIndex(nextIdx);
       songRef.current = nextTrack;
       await loadAndPlayFile(nextTrack);
    }
  }, [isShuffle, repeatMode, loadAndPlayFile, resumeAudioContext]);

  const prevSong = useCallback(async () => {
    await resumeAudioContext();
    if (progress > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }

    const q = queueRef.current;
    if (!q.length) return;

    const current = currentIndexRef.current;
    const prevIdx = current - 1 < 0 ? q.length - 1 : current - 1;
    const prevTrack = q[prevIdx];

    if (prevTrack) {
       setCurrentIndex(prevIdx);
       songRef.current = prevTrack;
       await loadAndPlayFile(prevTrack);
    }
  }, [progress, loadAndPlayFile, resumeAudioContext]);

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
      audioRef.current.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    navigator.mediaSession.setActionHandler('seekforward', handleSeekForward); // Mapped to Favorite

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