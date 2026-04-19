import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { momentsService, lettersService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

export default function BookPDF() {
  const { couple } = useAuth()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [moments, setMoments] = useState<any[]>([])
  const [letters, setLetters] = useState<Record<string,any>>({})
  const guestPosts: any[] = []

  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
    lettersService.getAll().then(res => {
      const map: Record<string,any> = {}
      res.data.forEach((l: any) => { map[l.capsule_key] = { text: l.text } })
      setLetters(map)
    }).catch(() => {})
  }, [])

  const loadImage = (url: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.onerror = reject
      img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
    })

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const W = 210
      const H = 297
      const ML = 24
      const MR = 24
      const TW = W - ML - MR

      // Paleta
      const BLACK   = [20,  15,  20]  as [number,number,number]
      const ROSE_MID = [124, 77,  107] as [number,number,number]
      const ROSE_LT  = [232, 196, 206] as [number,number,number]
      const ROSE_BG  = [255, 240, 243] as [number,number,number]
      const GRAY     = [150, 140, 145] as [number,number,number]
      const WHITE    = [255, 255, 255] as [number,number,number]

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let y = 0

      const bg = (color: [number,number,number]) => {
        doc.setFillColor(...color)
        doc.rect(0, 0, W, H, 'F')
      }

      const hline = (x1: number, x2: number, yy: number, color: [number,number,number], w = 0.3) => {
        doc.setDrawColor(...color)
        doc.setLineWidth(w)
        doc.line(x1, yy, x2, yy)
      }

      const vline = (xx: number, y1: number, y2: number, color: [number,number,number], w = 0.3) => {
        doc.setDrawColor(...color)
        doc.setLineWidth(w)
        doc.line(xx, y1, xx, y2)
      }

      const txt = (
        t: string, x: number, yy: number, size: number,
        color: [number,number,number],
        align: 'left'|'center'|'right' = 'left',
        maxW?: number,
        italic = false
      ): number => {
        doc.setFontSize(size)
        doc.setTextColor(...color)
        doc.setFont('helvetica', italic ? 'italic' : 'normal')
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, yy, { align })
          return lines.length * (size * 0.42) + 2
        }
        doc.text(t, x, yy, { align })
        return size * 0.42 + 2
      }

      const label = (t: string, x: number, yy: number, align: 'left'|'center'|'right' = 'left') =>
        txt(t.toUpperCase(), x, yy, 7, ROSE_MID, align)

      // ── CAPA ────────────────────────────────────────────────
      bg(WHITE)

      // Linha vertical decorativa
      vline(W / 2, 60, 100, ROSE_LT, 0.5)

      // Nome do casal
      const name = couple?.couple_name || 'Nosso casal'
      const parts = name.split(' e ')
      if (parts.length === 2) {
        txt(parts[0].trim(), W / 2, 118, 28, BLACK, 'center')
        txt('e', W / 2, 130, 10, ROSE_MID, 'center')
        txt(parts[1].trim(), W / 2, 142, 28, BLACK, 'center')
      } else {
        txt(name, W / 2, 130, 24, BLACK, 'center')
      }

      // Linha ornamental
      hline(W / 2 - 20, W / 2 + 20, 152, ROSE_LT, 0.4)

      // Data
      if (couple?.wedding_date) {
        const d = new Date(couple.wedding_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
        label(d, W / 2, 162, 'center')
      }

      vline(W / 2, 172, 220, ROSE_LT, 0.5)

      // Rodapé
      txt('Nossa História', W / 2, 280, 8, GRAY, 'center')

      // ── MOMENTOS ────────────────────────────────────────────
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
          .toUpperCase()

        if (m.photo_url) {
          // Página foto full-bleed
          doc.addPage()
          bg([30, 20, 25])

          let imgData: string | null = null
          try { imgData = await loadImage(m.photo_url).catch(() => null) } catch {}

          if (imgData) {
            // Cover: preenche a página toda sem esticar
            const tmpImg = new Image()
            await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = imgData! })
            const iw = tmpImg.naturalWidth || 1
            const ih = tmpImg.naturalHeight || 1
            const scale = Math.max(W / iw, H / ih)
            const drawW = iw * scale
            const drawH = ih * scale
            const drawX = (W - drawW) / 2
            const drawY = (H - drawH) / 2
            doc.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'MEDIUM')
          }

          // Overlay gradiente simulado (retângulo semi-transparente na base)
          doc.setFillColor(10, 5, 10)
          doc.rect(0, H - 55, W, 55, 'F')

          // Data e título sobre a foto
          txt(dateStr, ML, H - 38, 7, [200, 185, 195] as [number,number,number], 'left')
          doc.setTextColor(255, 255, 255)
          txt(m.title, ML, H - 26, 18, WHITE, 'left', TW)
          if (m.description) {
            txt(m.description, ML, H - 14, 8, [200, 185, 195], 'left', TW)
          }

        } else {
          // Página só texto — centralizado verticalmente
          doc.addPage()
          bg(WHITE)

          const blockH = 10 + 6 + 24 * 0.42 + (m.description ? 20 : 0)
          const startY = (H - blockH) / 2

          hline(ML, W - MR, startY - 10, ROSE_LT, 0.3)

          y = startY
          y += label(dateStr, ML, y)
          y += 6
          doc.setTextColor(...BLACK)
          y += txt(m.title, ML, y, 24, BLACK, 'left', TW)
          if (m.description) {
            y += 3
            hline(ML, ML + 16, y, ROSE_LT, 0.4)
            y += 8
            txt(m.description, ML, y, 10, GRAY, 'left', TW)
            y += 16
          }

          hline(ML, W - MR, y + 10, ROSE_LT, 0.3)
        }
      }

      // ── CARTA ───────────────────────────────────────────────
      if (letters.wedding?.text) {
        // Separador de capítulo
        doc.addPage()
        bg(WHITE)
        vline(W / 2, 90, 130, ROSE_LT, 0.5)
        txt('CAPÍTULO', W / 2, 134, 7, ROSE_MID, 'center')
        txt('Nossa Carta', W / 2, 152, 20, BLACK, 'center')
        vline(W / 2, 158, 200, ROSE_LT, 0.5)

        // Página da carta
        doc.addPage()
        bg(ROSE_BG)
        y = 50
        label('Escrita antes do casamento', ML, y)
        y += 14
        hline(ML, ML + 20, y, ROSE_LT, 0.4)
        y += 12
        const letterLines = doc.setFontSize(10).splitTextToSize(letters.wedding.text, TW)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...BLACK)
        doc.text(letterLines, ML, y)
      }

      // ── CONVIDADOS ──────────────────────────────────────────
      if (guestPosts.length > 0) {
        doc.addPage()
        bg(WHITE)
        vline(W / 2, 90, 130, ROSE_LT, 0.5)
        txt('CAPÍTULO', W / 2, 134, 7, ROSE_MID, 'center')
        txt('Mensagens da Família', W / 2, 152, 20, BLACK, 'center')
        vline(W / 2, 158, 200, ROSE_LT, 0.5)

        doc.addPage()
        bg(WHITE)
        y = 40
        for (const p of guestPosts) {
          if (y > 260) { doc.addPage(); bg(WHITE); y = 40 }
          hline(ML, W - MR, y, ROSE_LT, 0.3)
          y += 8
          y += txt(p.name, ML, y, 11, [100, 70, 90])
          y += txt(p.message, ML, y, 9, GRAY, 'left', TW) + 6
        }
      }

      // ── PÁGINA FINAL ────────────────────────────────────────
      doc.addPage()
      bg(WHITE)
      vline(W / 2, 80, 130, ROSE_LT, 0.5)
      txt(couple?.couple_name || 'Nossa História', W / 2, 148, 18, BLACK, 'center')
      vline(W / 2, 155, 200, ROSE_LT, 0.5)
      txt('Nossa História', W / 2, 272, 8, GRAY, 'center')

      doc.save(`nossa-historia-${(couple?.couple_name || 'casal').replace(/\s/g, '-')}.pdf`)
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{ background: '#FADADD', color: '#7C4D6B', border: '1px solid #E8C4CE' }}>←</button>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>Exportar livro em PDF</h2>
      </div>

      <div className="p-4">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#3D1A2A' }}>Nosso livro impresso</h2>
          <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#9B6B7A' }}>
            Um livro elegante com todos os momentos de vocês — fotos em página inteira, carta e mensagens da família.
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'fotos em página inteira' },
            { icon: '💌', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita ✅' : 'não escrita ainda' },
            { icon: '👨‍👩‍👧', label: `${guestPosts.length} mensagens da família`, sub: 'do álbum de convidados' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: '#E8C4CE' }}>
              <span className="text-xl w-8">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#9B6B7A' }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={generatePDF}
          disabled={generating || done}
          className="btn-primary disabled:opacity-60 py-4 text-base"
        >
          {done ? '✅ PDF baixado!' : generating ? '⏳ Gerando PDF...' : '📥 Gerar e baixar PDF'}
        </button>

        <p className="text-xs text-center mt-3" style={{ color: '#C9A0B0' }}>
          O PDF é gerado no seu celular — nenhum dado sai do seu dispositivo
        </p>
      </div>
    </Layout>
  )
}
