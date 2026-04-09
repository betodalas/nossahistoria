import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { momentsService } from '../services/api'
import { FREE_MOMENTS_LIMIT } from '../constants'
import Layout from '../components/Layout'
import VoiceRecorder from '../components/VoiceRecorder'

export default function AddMoment() {
  const { isPremium, couple } = useAuth()
  const bothRegistered = !!(couple?.user1_id && couple?.user2_id)
  const navigate = useNavigate()
  const location = useLocation()
  const editMoment = (location.state as any)?.moment || null
  const isEditing = !!editMoment

  const [title, setTitle] = useState(editMoment?.title || '')
  const [description, setDescription] = useState(editMoment?.description || '')
  const [date, setDate] = useState(editMoment?.moment_date?.split('T')[0] || new Date().toISOString().split('T')[0])
  const [photoPreview, setPhotoPreview] = useState<string | null>(editMoment?.photo_url || null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [musicName, setMusicName] = useState(editMoment?.music_name || '')
  const [musicLink, setMusicLink] = useState(editMoment?.music_link || '')
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Quando editando, a URL existente do áudio é passada como existingAudio para o recorder
  const existingVoiceUrl = isEditing ? (editMoment?.voice_url || undefined) : undefined

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleVoiceSave = (audio: string, dur: number) => {
    if (!audio) { setVoiceBlob(null); setVoiceDuration(0); return }
    setVoiceDuration(dur)
    try {
      const base64 = audio.split(',')[1] || audio
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      setVoiceBlob(new Blob([bytes], { type: 'audio/webm' }))
    } catch {
      setVoiceBlob(null)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setError('')
    setSaving(true)
    setUploadProgress(null)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('moment_date', date)
      if (musicName) formData.append('music_name', musicName)
      if (musicLink) formData.append('music_link', musicLink)
      if (photoFile) {
        formData.append('photo', photoFile)
        setUploadProgress(0)
      }
      if (voiceBlob) formData.append('audio', voiceBlob, 'voice.webm')
      if (voiceDuration) formData.append('voice_duration', String(voiceDuration))

      const onUploadProgress = photoFile
        ? (e: any) => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)) }
        : undefined

      if (isEditing) {
        await momentsService.update(editMoment.id, formData, onUploadProgress)
      } else {
        await momentsService.create(formData, onUploadProgress)
      }
      navigate('/linha-do-tempo')
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err?.response?.data?.error || ''
      if (status === 401) {
        setError('Sessão expirada. Faça login novamente.')
      } else if (status === 403) {
        setError(msg || `Você atingiu o limite de ${FREE_MOMENTS_LIMIT} momentos do plano gratuito. Faça upgrade para premium!`)
      } else if (status === 400) {
        setError(msg || 'Dados inválidos. Verifique os campos.')
      } else {
        setError(msg || 'Erro ao salvar. Verifique sua conexão e tente novamente.')
      }
    } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const canSave = title.trim() && !saving && bothRegistered

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: '#F5E6EA', color: '#7C4D6B' }}>←</button>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>
          {isEditing ? 'Editar momento' : 'Novo momento'}
        </h2>
      </div>

      <div className="p-4 pb-8">
        {!bothRegistered && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', color: '#7c3aed' }}>
            💑 Os dois precisam estar cadastrados para postar na timeline
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl text-sm text-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#e53e3e' }}>
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs block mb-1" style={{ color: '#7C4D6B' }}>Título *</label>
          <input className="input-field" placeholder="Ex: Nosso primeiro jantar"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-1" style={{ color: '#7C4D6B' }}>Data</label>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-1" style={{ color: '#7C4D6B' }}>Descrição</label>
          <textarea className="input-field resize-none" style={{ height: '90px' }}
            placeholder="Conte o que aconteceu..."
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-2" style={{ color: '#7C4D6B' }}>Foto</label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} className="w-full rounded-xl object-contain"
                style={{ maxHeight: '200px', background: '#F5E6EA' }} alt="Preview" />
              <button onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>×</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label className="flex flex-col items-center justify-center gap-1 flex-1 py-4 rounded-xl cursor-pointer text-xs font-medium"
                style={{ background: '#F5E6EA', border: '2px dashed #C9A0B0', color: '#7C4D6B' }}>
                🖼️ Galeria
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              <label className="flex flex-col items-center justify-center gap-1 flex-1 py-4 rounded-xl cursor-pointer text-xs font-medium"
                style={{ background: '#F5E6EA', border: '2px dashed #C9A0B0', color: '#7C4D6B' }}>
                📷 Câmera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              </label>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-2" style={{ color: '#7C4D6B' }}>Mensagem de voz</label>
          <VoiceRecorder
            onSave={handleVoiceSave}
            existingAudio={existingVoiceUrl}
            existingDuration={isEditing ? (editMoment?.voice_duration || 0) : undefined}
          />
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-1" style={{ color: '#7C4D6B' }}>Música do momento</label>
          <input className="input-field mb-2" placeholder="Nome da música · Ex: Perfect - Ed Sheeran"
            value={musicName} onChange={e => setMusicName(e.target.value)} />
          <input className="input-field" placeholder="Link do Spotify (opcional)"
            value={musicLink} onChange={e => setMusicLink(e.target.value)} />
        </div>

        {/* Barra de progresso do upload */}
        {uploadProgress !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#9B6B7A' }}>
              <span>Enviando foto...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: '#E8C4CE' }}>
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#C9A0B0,#7C4D6B)' }} />
            </div>
          </div>
        )}

        <div className="relative">
          <button onClick={handleSave} disabled={!canSave}
            className="btn-primary disabled:opacity-40 py-4 text-base mt-2">
            {saving ? '⏳ Salvando...' : isEditing ? '💾 Salvar alterações' : '💾 Salvar momento'}
          </button>
          {!bothRegistered && (
            <p className="text-xs text-center mt-2" style={{ color: '#9B6B7A' }}>
              Convide o(a) parceiro(a) antes de adicionar momentos
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}
