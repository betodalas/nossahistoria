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
        resolve(canvas.toDataURL('image/jpeg', 0.92))
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

      // Paleta
      const DARK    = [61,  26,  42]  as [number,number,number]
      const ROSE_MID= [124, 77,  107] as [number,number,number]
      const ROSE_LT = [232, 196, 206] as [number,number,number]
      const ROSE_BG = [255, 240, 243] as [number,number,number]
      const ROSE_CARD=[250, 218, 221] as [number,number,number]
      const GRAY    = [155, 107, 122] as [number,number,number]
      const WHITE   = [255, 255, 255] as [number,number,number]
      const SILVER  = [200, 185, 193] as [number,number,number]

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // ── helpers ────────────────────────────────────────────
      const bg = (c: [number,number,number]) => {
        doc.setFillColor(...c); doc.rect(0, 0, W, H, 'F')
      }

      const circle = (x: number, y: number, r: number, c: [number,number,number], alpha = 1) => {
        doc.setFillColor(...c)
        if (alpha < 1) {
          // Simulate opacity with a lighter blend using white mix
          const mixed: [number,number,number] = [
            Math.round(c[0] + (255 - c[0]) * (1 - alpha)),
            Math.round(c[1] + (255 - c[1]) * (1 - alpha)),
            Math.round(c[2] + (255 - c[2]) * (1 - alpha)),
          ]
          doc.setFillColor(...mixed)
        }
        doc.circle(x, y, r, 'F')
      }

      const rect = (x: number, y: number, w: number, h: number, c: [number,number,number]) => {
        doc.setFillColor(...c); doc.rect(x, y, w, h, 'F')
      }

      const txt = (t: string, x: number, y: number, size: number, c: [number,number,number], align: 'left'|'center'|'right' = 'left', maxW?: number, italic = false): number => {
        doc.setFontSize(size); doc.setTextColor(...c)
        doc.setFont('helvetica', italic ? 'italic' : 'normal')
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          return lines.length * (size * 0.42) + 2
        }
        doc.text(t, x, y, { align }); return size * 0.42 + 2
      }

      const dashedLine = (x1: number, y: number, x2: number, c: [number,number,number]) => {
        doc.setDrawColor(...c); doc.setLineWidth(0.3)
        const dashLen = 2, gap = 2
        for (let x = x1; x < x2; x += dashLen + gap) {
          doc.line(x, y, Math.min(x + dashLen, x2), y)
        }
      }

      const solidLine = (x1: number, y: number, x2: number, c: [number,number,number], w = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(x1, y, x2, y)
      }

      const tag = (label: string, x: number, y: number) => {
        const tw = label.length * 1.8 + 8
        rect(x, y - 4, tw, 7, ROSE_MID)
        txt(label, x + 4, y + 0.5, 6, WHITE)
        return tw
      }

      const stamp = (label: string, x: number, y: number) => {
        const tw = label.length * 1.6 + 8
        doc.setDrawColor(...ROSE_MID); doc.setLineWidth(0.4)
        doc.rect(x, y - 4, tw, 7)
        txt(label, x + 4, y + 0.5, 6, ROSE_MID)
      }

      const polaroid = (imgData: string | null, x: number, y: number, w: number, caption: string, angle = 0) => {
        const pad = 4, capH = 12, borderW = w + pad * 2, borderH = w * 0.75 + pad + capH
        // Simular rotação desenhando levemente deslocado (jsPDF não tem rotate nativo fácil)
        const ox = angle < 0 ? 1 : 0
        rect(x - pad + ox, y - pad, borderW, borderH, WHITE)
        doc.setDrawColor(...ROSE_LT); doc.setLineWidth(0.2)
        doc.rect(x - pad + ox, y - pad, borderW, borderH)
        if (imgData) {
          const ih = w * 0.75
          doc.addImage(imgData, 'JPEG', x + ox, y, w, ih, undefined, 'MEDIUM')
        } else {
          rect(x + ox, y, w, w * 0.75, ROSE_LT)
        }
        txt(caption, x - pad + ox + borderW / 2, y + w * 0.75 + pad + 5, 6, GRAY, 'center', borderW - 4, true)
      }

      const washiband = (x: number, y: number, w: number, c: [number,number,number]) => {
        const mixed: [number,number,number] = [
          Math.round(c[0] + (255 - c[0]) * 0.45),
          Math.round(c[1] + (255 - c[1]) * 0.45),
          Math.round(c[2] + (255 - c[2]) * 0.45),
        ]
        rect(x, y, w, 5, mixed)
      }

      const ornaments = (page: 'capa' | 'moment' | 'plain' | 'chapter' | 'final') => {
        if (page === 'capa') {
          circle(W - 20, 20, 18, ROSE_CARD, 0.5)
          circle(15, H - 30, 12, ROSE_LT, 0.4)
          txt('✦', 8, 30, 10, ROSE_LT)
          txt('♥', W - 12, H - 20, 14, ROSE_CARD)
          txt('✿', 12, H - 15, 9, ROSE_LT)
        }
        if (page === 'moment') {
          circle(W - 14, H - 20, 14, ROSE_CARD, 0.45)
          circle(8, 60, 8, ROSE_LT, 0.35)
          txt('♥', W - 10, 22, 12, ROSE_CARD)
          txt('✦', 6, H - 14, 8, ROSE_LT)
        }
        if (page === 'plain') {
          circle(W - 18, 30, 20, ROSE_CARD, 0.4)
          circle(10, H - 28, 14, ROSE_LT, 0.35)
          txt('✿', W - 12, H - 14, 12, ROSE_CARD)
          txt('✦', 8, 24, 8, ROSE_LT)
          txt('♥', W - 10, 50, 10, ROSE_LT)
        }
        if (page === 'chapter') {
          circle(W / 2, H / 2, 40, ROSE_CARD, 0.3)
          circle(20, 40, 15, ROSE_LT, 0.3)
          circle(W - 20, H - 40, 18, ROSE_LT, 0.3)
          txt('✦  ✦  ✦', W / 2, 30, 9, ROSE_LT, 'center')
          txt('✦  ✦  ✦', W / 2, H - 20, 9, ROSE_LT, 'center')
        }
        if (page === 'final') {
          circle(W / 2, H / 2 - 10, 45, ROSE_CARD, 0.3)
          circle(15, 30, 12, ROSE_LT, 0.3)
          circle(W - 15, H - 30, 16, ROSE_LT, 0.3)
          txt('✦', 8, 20, 10, ROSE_LT)
          txt('✿', W - 10, 20, 10, ROSE_LT)
        }
      }

      // ── CAPA ──────────────────────────────────────────────
      bg(ROSE_BG)
      ornaments('capa')

      // Bloco topo escuro
      rect(0, 0, W, 72, DARK)
      circle(W - 22, 18, 20, ROSE_MID, 0.35)
      circle(8, 60, 14, ROSE_MID, 0.2)
      txt('✦ NOSSA ✦', 16, 22, 7, ROSE_CARD)
      txt('História', 16, 46, 30, WHITE, 'left', undefined, true)
      txt('de amor', W - 16, 60, 9, ROSE_LT, 'right', undefined, true)

      // Polaroids na capa (sem fotos reais ainda)
      polaroid(null, 10, 80, 80, 'nosso momento ♥', -3)
      polaroid(null, 106, 92, 72, 'para sempre ✿', 2)

      // Nome e data
      dashedLine(14, 196, W - 14, ROSE_MID)
      txt('Roberto e Rosana', W / 2, 207, 14, DARK, 'center', undefined, true)
      stamp('4 DE ABRIL DE 2025', W / 2 - 28, 218)
      txt('✦ ♥ ✦', W / 2, 232, 10, ROSE_LT, 'center')

      // Washi tape decorativa no rodapé
      washiband(0, H - 18, W, ROSE_MID)
      txt('Nossa História  ·  uma vida juntos', W / 2, H - 11, 7, ROSE_MID, 'center')

      // ── MOMENTOS ──────────────────────────────────────────
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
          .toUpperCase()

        doc.addPage()
        bg(ROSE_BG)

        if (m.photo_url) {
          ornaments('moment')
          washiband(0, 14, W, ROSE_LT)

          let y = 26
          tag(dateStr, 14, y); y += 12
          y += txt(m.title, 14, y, 18, DARK, 'left', W - 28, true)
          y += 4

          let imgData: string | null = null
          try { imgData = await loadImage(m.photo_url).catch(() => null) } catch {}

          const caption = m.description ? '' : '♥ ' + m.title.toLowerCase() + ' ♥'
          const maxImgH = m.description ? 148 : 168
          const imgW = W - 28

          if (imgData) {
            const tmpImg = new Image()
            await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = imgData! })
            const iw = tmpImg.naturalWidth || 4
            const ih = tmpImg.naturalHeight || 3
            const imgH = Math.min(imgW * (ih / iw), maxImgH)

            // Polaroid frame
            rect(12, y - 3, imgW + 4, imgH + 16, WHITE)
            doc.setDrawColor(...ROSE_LT); doc.setLineWidth(0.2)
            doc.rect(12, y - 3, imgW + 4, imgH + 16)
            doc.addImage(imgData, 'JPEG', 14, y, imgW, imgH, undefined, 'MEDIUM')
            txt('♥ ' + m.title.toLowerCase() + ' ♥', W / 2, y + imgH + 8, 6, GRAY, 'center', imgW, true)
            y += imgH + 20
          } else {
            rect(12, y, imgW + 4, 80, ROSE_CARD)
            y += 90
          }

          if (m.description) {
            solidLine(14, y, 14, ROSE_MID, 1.5)
            doc.setDrawColor(...ROSE_MID); doc.setLineWidth(1.2)
            doc.line(14, y, 14, y + 20)
            txt(m.description, 20, y + 4, 9, ROSE_MID, 'left', W - 34, true)
          }

        } else {
          ornaments('plain')
          washiband(0, 14, W, ROSE_CARD)

          const titleLines = doc.setFontSize(22).splitTextToSize(m.title, W - 40).length
          const descLines = m.description ? doc.setFontSize(9).splitTextToSize(m.description, W - 40).length : 0
          const blockH = 14 + 10 + titleLines * 10 + (descLines > 0 ? descLines * 5 + 16 : 0)
          let y = (H - blockH) / 2

          dashedLine(14, y - 8, W - 14, ROSE_LT)
          tag(dateStr, 14, y); y += 12
          rect(14, y, 3, titleLines * 10, ROSE_MID)
          y += txt(m.title, 22, y + 8, 22, DARK, 'left', W - 36, true)

          if (m.description) {
            y += 6
            txt(m.description, 14, y, 9, GRAY, 'left', W - 28, true)
            y += descLines * 5 + 4
          }
          dashedLine(14, y + 8, W - 14, ROSE_LT)
          txt('♥', W / 2, y + 20, 14, ROSE_LT, 'center')
        }
      }

      // ── CARTA ─────────────────────────────────────────────
      if (letters.wedding?.text) {
        // Separador
        doc.addPage(); bg(ROSE_BG); ornaments('chapter')
        txt('✦ ✦ ✦', W / 2, 100, 10, ROSE_LT, 'center')
        txt('CAPÍTULO', W / 2, 116, 7, SILVER, 'center')
        solidLine(W / 2 - 20, 122, W / 2 + 20, ROSE_LT, 0.4)
        txt('Nossa Carta', W / 2, 136, 20, DARK, 'center', undefined, true)
        solidLine(W / 2 - 20, 142, W / 2 + 20, ROSE_LT, 0.4)
        txt('✦ ✦ ✦', W / 2, 155, 10, ROSE_LT, 'center')

        // Página da carta
        doc.addPage(); bg(ROSE_BG); ornaments('plain')
        washiband(0, 14, W, ROSE_MID)
        rect(14, 26, W - 28, 9, ROSE_MID)
        txt('♥  CARTA DO CASAMENTO', 18, 33, 7, WHITE)
        dashedLine(14, 42, W - 14, ROSE_LT)
        rect(14, 46, W - 28, H - 80, WHITE)
        doc.setDrawColor(...ROSE_LT); doc.setLineWidth(0.3)
        doc.rect(14, 46, W - 28, H - 80)
        txt(letters.wedding.text, 20, 58, 9, DARK, 'left', W - 40, true)
        txt('♥ ✦ ♥', W / 2, H - 24, 12, ROSE_LT, 'center')
      }

      // ── CONVIDADOS ────────────────────────────────────────
      if (guestPosts.length > 0) {
        doc.addPage(); bg(ROSE_BG); ornaments('chapter')
        txt('✦ ✦ ✦', W / 2, 100, 10, ROSE_LT, 'center')
        txt('CAPÍTULO', W / 2, 116, 7, SILVER, 'center')
        solidLine(W / 2 - 20, 122, W / 2 + 20, ROSE_LT, 0.4)
        txt('Mensagens da Família', W / 2, 136, 18, DARK, 'center', undefined, true)
        solidLine(W / 2 - 20, 142, W / 2 + 20, ROSE_LT, 0.4)
        txt('✦ ✦ ✦', W / 2, 155, 10, ROSE_LT, 'center')

        doc.addPage(); bg(ROSE_BG)
        washiband(0, 14, W, ROSE_LT)
        let y = 28
        for (const p of guestPosts) {
          if (y > 260) { doc.addPage(); bg(ROSE_BG); washiband(0, 14, W, ROSE_LT); y = 28 }
          dashedLine(14, y, W - 14, ROSE_LT); y += 6
          y += txt(p.name, 14, y, 11, ROSE_MID, 'left', undefined, true)
          y += txt(p.message, 14, y, 9, GRAY, 'left', W - 28, true) + 8
        }
      }

      // ── PÁGINA FINAL ──────────────────────────────────────
      doc.addPage(); bg(ROSE_BG); ornaments('final')
      txt('♥', W / 2, 110, 28, ROSE_CARD, 'center')
      txt(couple?.couple_name || 'Nossa História', W / 2, 140, 18, DARK, 'center', undefined, true)
      solidLine(W / 2 - 18, 148, W / 2 + 18, ROSE_LT, 0.4)
      txt('NOSSA HISTÓRIA · ' + new Date().getFullYear(), W / 2, 160, 7, SILVER, 'center')
      txt('✦  ✦  ✦', W / 2, 176, 10, ROSE_LT, 'center')
      washiband(0, H - 18, W, ROSE_MID)
      txt('feito com amor  ♥', W / 2, H - 11, 7, ROSE_MID, 'center')

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
            Um álbum estilo scrapbook com polaroids, elementos decorativos e toda a história de vocês.
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'estilo polaroid com decorações' },
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
