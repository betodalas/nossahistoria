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
      const ML = 20
      const MR = 20
      const TW = W - ML - MR

      const BLACK    = [20,  15,  18]  as [number,number,number]
      const ROSE_MID = [124, 77,  107] as [number,number,number]
      const ROSE_LT  = [232, 196, 206] as [number,number,number]
      const ROSE_BG  = [255, 248, 249] as [number,number,number]
      const GRAY     = [155, 107, 122] as [number,number,number]
      const SILVER   = [200, 190, 195] as [number,number,number]
      const WHITE    = [255, 255, 255] as [number,number,number]

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

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

      const cap = (t: string, x: number, yy: number, align: 'left'|'center'|'right' = 'left') =>
        txt(t.toUpperCase(), x, yy, 7, SILVER, align)

      // ── CAPA ──────────────────────────────────────────────
      bg(WHITE)
      vline(W / 2, 62, 106, ROSE_LT, 0.4)

      const name = couple?.couple_name || 'Nosso casal'
      const parts = name.split(' e ')
      if (parts.length === 2) {
        txt(parts[0].trim(), W / 2, 120, 26, BLACK, 'center')
        txt('e', W / 2, 131, 9, ROSE_MID, 'center')
        txt(parts[1].trim(), W / 2, 142, 26, BLACK, 'center')
      } else {
        txt(name, W / 2, 131, 24, BLACK, 'center')
      }

      hline(W / 2 - 18, W / 2 + 18, 151, ROSE_LT, 0.4)

      if (couple?.wedding_date) {
        const d = new Date(couple.wedding_date)
          .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
        cap(d, W / 2, 162, 'center')
      }

      vline(W / 2, 169, 215, ROSE_LT, 0.4)
      txt('Nossa História', W / 2, 278, 7, SILVER, 'center')

      // ── MOMENTOS ──────────────────────────────────────────
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
          .toUpperCase()

        doc.addPage()
        bg(WHITE)

        if (m.photo_url) {
          // Layout editorial: data + título no topo, foto com margem, descrição embaixo
          let y = 22
          y += cap(dateStr, ML, y)
          y += 3
          y += txt(m.title, ML, y, 16, BLACK, 'left', TW)
          y += 6

          // Foto com margem — proporção correta, max height para caber descrição
          let imgData: string | null = null
          try { imgData = await loadImage(m.photo_url).catch(() => null) } catch {}

          if (imgData) {
            const tmpImg = new Image()
            await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = imgData! })
            const iw = tmpImg.naturalWidth || 4
            const ih = tmpImg.naturalHeight || 3
            const ratio = ih / iw
            const maxImgH = m.description ? 170 : 210
            const imgW = TW
            const imgH = Math.min(imgW * ratio, maxImgH)

            // Borda fina cinza ao redor da foto — estilo fotógrafo
            doc.setDrawColor(...ROSE_LT)
            doc.setLineWidth(0.3)
            doc.rect(ML - 0.5, y - 0.5, imgW + 1, imgH + 1)
            doc.addImage(imgData, 'JPEG', ML, y, imgW, imgH, undefined, 'MEDIUM')
            y += imgH + 6
          }

          if (m.description) {
            hline(ML, ML + 12, y, ROSE_LT, 0.3)
            y += 6
            txt(m.description, ML, y, 9, GRAY, 'left', TW)
          }

        } else {
          // Sem foto — texto centralizado verticalmente
          const titleLines = doc.setFontSize(22).splitTextToSize(m.title, TW).length
          const blockH = 10 + 8 + titleLines * (22 * 0.42) + (m.description ? 24 : 0)
          let y = (H - blockH) / 2

          hline(ML, W - MR, y - 10, ROSE_LT, 0.3)
          y += cap(dateStr, ML, y)
          y += 8
          doc.setTextColor(...BLACK)
          y += txt(m.title, ML, y, 22, BLACK, 'left', TW)

          if (m.description) {
            y += 4
            hline(ML, ML + 12, y, ROSE_LT, 0.3)
            y += 7
            txt(m.description, ML, y, 9, GRAY, 'left', TW)
            y += 14
          }
          hline(ML, W - MR, y + 6, ROSE_LT, 0.3)
        }

        // Número de página discreto
        txt(String(doc.getNumberOfPages()), W - MR, H - 10, 7, SILVER, 'right')
      }

      // ── CARTA ─────────────────────────────────────────────
      if (letters.wedding?.text) {
        doc.addPage()
        bg(WHITE)
        vline(W / 2, 80, 116, ROSE_LT, 0.4)
        cap('Capítulo', W / 2, 122, 'center')
        txt('Nossa Carta', W / 2, 136, 18, BLACK, 'center')
        vline(W / 2, 142, 180, ROSE_LT, 0.4)

        doc.addPage()
        bg(ROSE_BG)
        let y = 40
        cap('Carta do casamento', ML, y)
        y += 10
        hline(ML, ML + 14, y, ROSE_LT, 0.3)
        y += 10
        txt(letters.wedding.text, ML, y, 10, BLACK, 'left', TW, true)
      }

      // ── CONVIDADOS ────────────────────────────────────────
      if (guestPosts.length > 0) {
        doc.addPage()
        bg(WHITE)
        vline(W / 2, 80, 116, ROSE_LT, 0.4)
        cap('Capítulo', W / 2, 122, 'center')
        txt('Mensagens da Família', W / 2, 136, 18, BLACK, 'center')
        vline(W / 2, 142, 180, ROSE_LT, 0.4)

        doc.addPage()
        bg(WHITE)
        let y = 40
        for (const p of guestPosts) {
          if (y > 260) { doc.addPage(); bg(WHITE); y = 40 }
          hline(ML, W - MR, y, ROSE_LT, 0.3)
          y += 8
          y += txt(p.name, ML, y, 11, ROSE_MID)
          y += txt(p.message, ML, y, 9, GRAY, 'left', TW) + 6
        }
      }

      // ── PÁGINA FINAL ──────────────────────────────────────
      doc.addPage()
      bg(WHITE)
      vline(W / 2, 90, 128, ROSE_LT, 0.4)
      txt(couple?.couple_name || 'Nossa História', W / 2, 144, 16, BLACK, 'center')
      vline(W / 2, 150, 188, ROSE_LT, 0.4)
      txt('Nossa História', W / 2, 272, 7, SILVER, 'center')

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
            Um livro elegante com todos os momentos de vocês — estilo álbum fotográfico.
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'com fotos em moldura editorial' },
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
