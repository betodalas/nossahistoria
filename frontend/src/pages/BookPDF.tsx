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
  const allAnswers: Record<string, any> = {}
  const guestPosts: any[] = []

  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
    lettersService.getAll().then(res => {
      const map: Record<string,any> = {}
      res.data.forEach((l: any) => { map[l.capsule_key] = { text: l.text } })
      setLetters(map)
    }).catch(() => {})
  }, [])

  const answers = Object.values(allAnswers)

  // Paleta rosé — consistente com o app
  const ROSE_BG   = [255, 240, 243] as [number,number,number]  // #FFF0F3
  const ROSE_DARK = [61,  26,  42]  as [number,number,number]  // #3D1A2A
  const ROSE_MID  = [124, 77,  107] as [number,number,number]  // #7C4D6B
  const ROSE_LIGHT= [232, 196, 206] as [number,number,number]  // #E8C4CE
  const ROSE_CARD = [250, 218, 221] as [number,number,number]  // #FADADD
  const WHITE     = [255, 255, 255] as [number,number,number]
  const GRAY      = [155, 107, 122] as [number,number,number]  // #9B6B7A

  const ML = 20  // margin left
  const MR = 20  // margin right
  const TW = 210 - ML - MR  // text width = 170mm

  const loadImage = (url: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
    })

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      let y = 0

      const newPage = (withHeader = false) => {
        doc.addPage()
        // fundo rosé claro
        doc.setFillColor(...ROSE_BG)
        doc.rect(0, 0, 210, 297, 'F')
        y = withHeader ? 50 : 20
      }

      const text = (
        t: string, x: number, size: number,
        color: [number,number,number],
        align: 'left'|'center'|'right' = 'left',
        maxW?: number
      ) => {
        doc.setFontSize(size)
        doc.setTextColor(...color)
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          y += lines.length * (size * 0.42) + 2
        } else {
          doc.text(t, x, y, { align })
          y += size * 0.42 + 2
        }
      }

      const chapterHeader = (num: string, title: string) => {
        // Faixa de cabeçalho
        doc.setFillColor(...ROSE_CARD)
        doc.rect(0, 0, 210, 38, 'F')
        doc.setFillColor(...ROSE_LIGHT)
        doc.rect(0, 36, 210, 2, 'F')
        y = 12
        text(num, 105, 9, ROSE_MID, 'center')
        text(title, 105, 20, ROSE_DARK, 'center')
        y = 50
      }

      const divider = () => {
        doc.setDrawColor(...ROSE_LIGHT)
        doc.setLineWidth(0.4)
        doc.line(ML, y, 210 - MR, y)
        y += 6
      }

      // ── CAPA ──────────────────────────────────────────────
      doc.setFillColor(...WHITE)
      doc.rect(0, 0, 210, 297, 'F')

      // Bloco superior rosé
      doc.setFillColor(...ROSE_CARD)
      doc.rect(0, 0, 210, 140, 'F')

      // Ornamento central — círculo decorativo
      doc.setDrawColor(...ROSE_LIGHT)
      doc.setLineWidth(0.8)
      doc.circle(105, 90, 50)
      doc.setLineWidth(0.3)
      doc.circle(105, 90, 55)

      // Título
      y = 72
      doc.setFontSize(38)
      doc.setTextColor(...ROSE_DARK)
      doc.text('Nossa', 105, y, { align: 'center' })
      y += 17
      doc.text('História', 105, y, { align: 'center' })

      // Linha decorativa sob título
      y = 148
      doc.setDrawColor(...ROSE_LIGHT)
      doc.setLineWidth(0.5)
      doc.line(60, y, 150, y)

      // Nome do casal
      y = 162
      doc.setFontSize(15)
      doc.setTextColor(...ROSE_MID)
      doc.text(couple?.couple_name || 'Nosso casal', 105, y, { align: 'center' })

      if (couple?.wedding_date) {
        y += 10
        doc.setFontSize(11)
        doc.setTextColor(...GRAY)
        doc.text(
          new Date(couple.wedding_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
          105, y, { align: 'center' }
        )
      }

      // Stats
      y = 230
      const stats = [
        { n: moments.length, label: 'momentos' },
        { n: answers.length, label: 'perguntas' },
        { n: guestPosts.length, label: 'mensagens' },
      ]
      const colW = 170 / 3
      stats.forEach((s, i) => {
        const cx = ML + colW * i + colW / 2
        doc.setFontSize(20)
        doc.setTextColor(...ROSE_DARK)
        doc.text(String(s.n), cx, y, { align: 'center' })
        doc.setFontSize(9)
        doc.setTextColor(...GRAY)
        doc.text(s.label, cx, y + 7, { align: 'center' })
      })

      // Rodapé capa
      doc.setFillColor(...ROSE_CARD)
      doc.rect(0, 280, 210, 17, 'F')
      doc.setFontSize(8)
      doc.setTextColor(...ROSE_MID)
      doc.text('Nossa História · gerado com amor', 105, 290, { align: 'center' })

      // ── CAP 1 — MOMENTOS ──────────────────────────────────
      if (moments.length > 0) {
        newPage()
        chapterHeader('Capítulo 1', 'Nossos Momentos')

        for (const m of moments) {
          if (y > 248) { newPage(); y = 20 }

          divider()
          text(
            new Date(m.moment_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
            ML, 9, GRAY
          )
          text(m.title, ML, 14, ROSE_DARK, 'left', TW)
          if (m.description) text(m.description, ML, 10, GRAY, 'left', TW)
          if (m.music_name) {
            y += 1
            // Pill de música
            doc.setFillColor(...ROSE_CARD)
            doc.rect(ML, y - 4, TW, 10, 'F')
            text(`♪  ${m.music_name}`, ML + 4, 9, ROSE_MID, 'left', TW - 8)
          }

          if (m.photo_url) {
            try {
              if (y > 210) { newPage(); y = 20 }
              const imgData = await loadImage(m.photo_url).catch(() => null)
              if (imgData) {
                const tmpImg = new Image()
                await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = imgData })
                const ratio = tmpImg.naturalHeight > 0 && tmpImg.naturalWidth > 0
                  ? tmpImg.naturalHeight / tmpImg.naturalWidth : 0.75
                const imgW = TW
                const imgH = Math.min(imgW * ratio, 90)
                doc.setFillColor(...ROSE_LIGHT)
                doc.rect(ML - 1, y - 1, imgW + 2, imgH + 2, 'F')
                doc.addImage(imgData, 'JPEG', ML, y, imgW, imgH, undefined, 'MEDIUM')
                y += imgH + 6
              }
            } catch { /* pula foto com erro sem abortar o PDF */ }
          }
          y += 4
        }
      }

      // ── CAP 2 — PERGUNTAS ────────────────────────────────
      if (answers.length > 0) {
        newPage()
        chapterHeader('Capítulo 2', 'Nossas Respostas')

        for (const a of answers.slice(0, 20)) {
          if (y > 240) { newPage(); y = 20 }
          divider()
          text(`"${a.question}"`, ML, 9, GRAY, 'left', TW)
          y += 1
          text(`Você: ${a.myAnswer}`, ML, 10, ROSE_DARK, 'left', TW)
          if (a.partnerAnswer)
            text(`${couple?.partner_name || 'Parceiro(a)'}: ${a.partnerAnswer}`, ML, 10, ROSE_MID, 'left', TW)
          y += 3
        }
      }

      // ── CAP 3 — CARTA ────────────────────────────────────
      if (letters.wedding?.text) {
        newPage()
        chapterHeader('Capítulo 3', 'Nossa Carta')
        // Card de carta
        const cardH = Math.min(letters.wedding.text.length * 0.5 + 20, 200)
        doc.setFillColor(...WHITE)
        doc.setDrawColor(...ROSE_LIGHT)
        doc.setLineWidth(0.5)
        doc.rect(ML, y, TW, cardH, 'FD')
        y += 8
        text('Carta escrita antes do casamento:', ML + 6, 9, GRAY, 'left', TW - 12)
        y += 2
        text(letters.wedding.text, ML + 6, 10, ROSE_DARK, 'left', TW - 12)
      }

      // ── CAP 4 — CONVIDADOS ───────────────────────────────
      if (guestPosts.length > 0) {
        newPage()
        chapterHeader('Capítulo 4', 'Mensagens da Família')

        for (const p of guestPosts) {
          if (y > 250) { newPage(); y = 20 }
          divider()
          text(p.name, ML, 12, ROSE_MID)
          text(p.message, ML, 10, GRAY, 'left', TW)
          y += 3
        }
      }

      // ── PÁGINA FINAL ──────────────────────────────────────
      newPage()
      doc.setFillColor(...ROSE_CARD)
      doc.rect(0, 0, 210, 297, 'F')
      y = 110
      doc.setFontSize(36)
      doc.setTextColor(...ROSE_LIGHT)
      doc.text('♥', 105, y, { align: 'center' })
      y += 20
      doc.setFontSize(11)
      doc.setTextColor(...ROSE_MID)
      doc.text('Gerado com amor pelo', 105, y, { align: 'center' })
      y += 8
      doc.setFontSize(16)
      doc.setTextColor(...ROSE_DARK)
      doc.text('Nossa História', 105, y, { align: 'center' })
      y += 10
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      doc.text(new Date().toLocaleDateString('pt-BR'), 105, y, { align: 'center' })

      doc.save(`nossa-historia-${couple?.couple_name?.replace(/\s/g, '-') || 'casal'}.pdf`)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
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

      <div className="flex-1 p-4">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#3D1A2A' }}>Nosso livro impresso</h2>
          <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#9B6B7A' }}>
            Gera um PDF com toda a história de vocês — momentos, perguntas, cartas e mensagens da família
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no PDF</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'com fotos e descrições' },
            { icon: '💬', label: `${answers.length} perguntas respondidas`, sub: 'respostas dos dois' },
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
