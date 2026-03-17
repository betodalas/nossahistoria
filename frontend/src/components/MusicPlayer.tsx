import { useState } from 'react'

interface Props { musicName: string }

export default function MusicPlayer({ musicName }: Props) {
  const [playing, setPlaying] = useState(false)

  const openYouTubeMusic = () => {
    const query = encodeURIComponent(musicName)
    window.open(`https://music.youtube.com/search?q=${query}`, '_blank')
  }

  const openSpotify = () => {
    const query = encodeURIComponent(musicName)
    window.open(`https://open.spotify.com/search/${query}`, '_blank')
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{border:'1px solid rgba(124,58,237,0.25)'}}>
      {!playing ? (
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          style={{background:'rgba(124,58,237,0.15)'}}
          onClick={() => setPlaying(true)}
        >
          <span className="text-lg">🎵</span>
          <div className="flex-1">
            <p className="text-xs text-violet-300 font-medium">{musicName}</p>
            <p className="text-xs text-white/60">toque para ouvir</p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}}>
            ▶
          </div>
        </div>
      ) : (
        <div style={{background:'rgba(124,58,237,0.15)'}}>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-lg animate-pulse">🎵</span>
            <p className="text-xs text-violet-300 font-medium flex-1">{musicName}</p>
            <button onClick={() => setPlaying(false)}
              className="text-xs text-white/60 px-2 py-1 rounded-lg"
              style={{background:'rgba(255,255,255,0.08)'}}>✕</button>
          </div>
          <div className="px-3 pb-3 flex gap-2">
            <button
              onClick={openYouTubeMusic}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{background:'rgba(255,0,0,0.2)', border:'1px solid rgba(255,0,0,0.3)', color:'#ff6b6b'}}
            >
              ▶ YouTube Music
            </button>
            <button
              onClick={openSpotify}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{background:'rgba(30,215,96,0.15)', border:'1px solid rgba(30,215,96,0.3)', color:'#1ed760'}}
            >
              ● Spotify
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
