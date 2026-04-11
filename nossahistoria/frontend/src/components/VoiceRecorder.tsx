import { useState, useRef, useEffect } from 'react'

interface Props {
  onSave: (audioBase64: string, duration: number) => void
  existingAudio?: string
  existingDuration?: number
}

export default function VoiceRecorder({ onSave, existingAudio, existingDuration }: Props) {
  const [state, setState] = useState<'idle'|'recording'|'recorded'|'playing'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio || null)
  const [duration, setDuration] = useState(existingDuration || 0)
  const [playProgress, setPlayProgress] = useState(0)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<any>(null)

  useEffect(() => {
    if (existingAudio) { setAudioUrl(existingAudio); setState('recorded') }
  }, [existingAudio])

  const fmtTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = ev => {
          const base64 = ev.target?.result as string
          setAudioUrl(base64)
          setDuration(seconds)
          setState('recorded')
          onSave(base64, seconds)
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      alert('Permita o acesso ao microfone para gravar')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    clearInterval(timerRef.current)
  }

  const playAudio = () => {
    if (!audioUrl) return
    if (state === 'playing') {
      audioRef.current?.pause()
      setState('recorded')
      clearInterval(progressRef.current)
      setPlayProgress(0)
      return
    }
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.play()
    setState('playing')
    progressRef.current = setInterval(() => {
      if (audio.ended) { setState('recorded'); setPlayProgress(0); clearInterval(progressRef.current) }
      else setPlayProgress((audio.currentTime / audio.duration) * 100)
    }, 100)
  }

  const deleteAudio = () => {
    audioRef.current?.pause()
    clearInterval(progressRef.current)
    setAudioUrl(null)
    setState('idle')
    setSeconds(0)
    setPlayProgress(0)
    onSave('', 0)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(124,58,237,0.25)'}}>

      {state === 'idle' && (
        <button onClick={startRecording} className="w-full flex items-center gap-3 px-4 py-3"
          style={{background:'rgba(124,58,237,0.1)'}}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}}>🎙️</div>
          <div className="text-left">
            <p className="text-sm font-semibold text-violet-300">Gravar mensagem de voz</p>
            <p className="text-xs text-white/60">toque para gravar</p>
          </div>
        </button>
      )}

      {state === 'recording' && (
        <div className="px-4 py-3" style={{background:'rgba(190,24,93,0.15)'}}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
              style={{background:'rgba(190,24,93,0.4)', border:'2px solid #be185d'}}>🔴</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-pink-300">Gravando...</p>
              <p className="text-xs text-white/60">{fmtTime(seconds)}</p>
            </div>
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-1 rounded-full animate-bounce"
                  style={{background:'#be185d', height:`${8+(i%3)*8}px`, animationDelay:`${i*0.1}s`, animationDuration:'0.6s'}} />
              ))}
            </div>
          </div>
          <button onClick={stopRecording} className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{background:'rgba(190,24,93,0.3)', border:'1px solid rgba(190,24,93,0.5)', color:'#fda4af'}}>
            ⏹ Parar gravação
          </button>
        </div>
      )}

      {(state === 'recorded' || state === 'playing') && (
        <div className="px-4 py-3" style={{background:'rgba(124,58,237,0.1)'}}>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={playAudio}
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}}>
              {state === 'playing' ? '⏸' : '▶'}
            </button>
            <div className="flex-1">
              <p className="text-xs text-violet-300 font-semibold mb-1">Mensagem de voz</p>
              <div className="w-full h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.1)'}}>
                <div className="h-full rounded-full transition-all"
                  style={{width:`${playProgress}%`, background:'linear-gradient(90deg,#7c3aed,#be185d)'}} />
              </div>
            </div>
            <span className="text-xs text-white/60">{fmtTime(duration)}</span>
            <button onClick={deleteAudio}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.65)'}}>✕</button>
          </div>
          {state === 'playing' && (
            <div className="flex items-center gap-0.5 justify-center mt-1">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="w-1 rounded-full animate-bounce"
                  style={{background:'#7c3aed', height:`${4+(i%4)*5}px`, animationDelay:`${i*0.08}s`}} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
