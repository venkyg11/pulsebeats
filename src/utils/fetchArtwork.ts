const cache: Record<string, string> = {};

export async function fetchMovieArt(albumName: string): Promise<string | null> {
  if (!albumName || albumName === 'Unknown Album') return null;
  if (cache[albumName]) return cache[albumName];
  
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(albumName + " telugu")}&media=music&limit=5&country=IN`
    );
    const data = await res.json();
    if (data.results?.length > 0) {
      // Get the highest resolution possible by replacing 100x100
      const url = data.results[0].artworkUrl100.replace("100x100bb", "500x500bb").replace("100x100", "500x500");
      cache[albumName] = url;
      return url;
    }
  } catch (e) {
    console.error("Failed to fetch iTunes artwork", e);
  }
  return null;
}
