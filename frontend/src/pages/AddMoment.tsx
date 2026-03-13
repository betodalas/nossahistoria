import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import VoiceRecorder from '../components/VoiceRecorder'

export default function AddMoment() {
  const { isPremium } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [photo, setPhoto] = useState<string | null>(null)
  const [musicName, setMusicName] = useState('')
  const [musicLink, setMusicLink] = useState('')
  const [voiceAudio, setVoiceAudio] = useState('')
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [saving, setSaving] = useState(false)

  const moments = JSON.parse(localStorage.getItem('moments') || '[]')
  const FREE_LIMIT = 10
  const atLimit = !isPremium && moments.length >= FREE_LIMIT

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!title.trim()) return
    setSaving(true)
    setTimeout(() => {
      const newMoment = {
        id: Date.now().toString(),
        title,
        description,
        moment_date: date,
        photo_url: photo,
        music_name: musicName,
        music_link: musicLink,
        voice_audio: voiceAudio,
        voice_duration: voiceDuration,
        created_at: new Date().toISOString(),
      }
      const updated = [newMoment, ...moments]
      localStorage.setItem('moments', JSON.stringify(updated))
      setSaving(false)
      navigate('/linha-do-tempo')
    }, 600)
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-violet-300 px-3 py-1.5 rounded-lg text-sm"
          style={{background:'#1e1035'}}>←</button>
        <h2 className="text-base font-semibold text-white">Novo momento</h2>
      </div>

      {atLimit ? (
        <div className="p-4 text-center py-12">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-base font-bold text-white mb-2">Limite atingido</p>
          <p className="text-sm text-white/50 mb-6">Faça upgrade para adicionar momentos ilimitados</p>
          <button className="btn-primary max-w-xs mx-auto" onClick={() => navigate('/premium')}>
            👑 Ver plano premium
          </button>
        </div>
      ) : (
        <div className="p-4 pb-8">

          <div className="mb-4">
            <label className="text-xs text-white/40 block mb-1">Título *</label>
            <input className="input-field" placeholder="Ex: Nosso primeiro jantar" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="text-xs text-white/40 block mb-1">Data</label>
            <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="text-xs text-white/40 block mb-1">Descrição</label>
            <textarea className="input-field resize-none" style={{height:'90px'}}
              placeholder="Conte o que aconteceu..."
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Foto */}
          <div className="mb-4">
            <label className="text-xs text-white/40 block mb-2">Foto</label>
            {photo ? (
              <div className="relative">
                <img src={photo} className="w-full rounded-xl object-contain" style={{maxHeight:'200px', background:'#0f0a1a'}} />
                <button onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{background:'rgba(0,0,0,0.7)', color:'white'}}>×</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer text-sm"
                style={{background:'rgba(255,255,255,0.05)', border:'2px dashed rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.3)'}}>
                📷 Adicionar foto
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            )}
          </div>

          {/* Voz */}
          <div className="mb-4">
            <label className="text-xs text-white/40 block mb-2">Mensagem de voz</label>
            <VoiceRecorder
              onSave={(audio, dur) => { setVoiceAudio(audio); setVoiceDuration(dur) }}
              existingAudio={voiceAudio || undefined}
              existingDuration={voiceDuration || undefined}
            />
          </div>

          {/* Música */}
          <div className="mb-4">
            <label className="text-xs text-white/40 block mb-1">Música do momento</label>
            <input className="input-field mb-2" placeholder="Nome da música · Ex: Perfect - Ed Sheeran"
              value={musicName} onChange={e => setMusicName(e.target.value)} />
            <input className="input-field" placeholder="Link do Spotify (opcional)"
              value={musicLink} onChange={e => setMusicLink(e.target.value)} />
          </div>

          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="btn-primary disabled:opacity-40 py-4 text-base mt-2">
            {saving ? 'Salvando...' : '💾 Salvar momento'}
          </button>
        </div>
      )}
    </Layout>
  )
}
