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

      const W = 210, H = 297
      const DARK     = [61,  26,  42]  as [number,number,number]
      const ROSE_MID = [124, 77,  107] as [number,number,number]
      const ROSE_LT  = [232, 196, 206] as [number,number,number]
      const ROSE_BG  = [255, 240, 243] as [number,number,number]
      const ROSE_CARD= [250, 218, 221] as [number,number,number]
      const GRAY     = [155, 107, 122] as [number,number,number]
      const WHITE    = [255, 255, 255] as [number,number,number]
      const SILVER   = [200, 185, 193] as [number,number,number]

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // ── primitives ─────────────────────────────────────────
      const bg = (c: [number,number,number]) => {
        doc.setFillColor(...c); doc.rect(0, 0, W, H, 'F')
      }
      const fillR = (x: number, y: number, w: number, h: number, c: [number,number,number]) => {
        doc.setFillColor(...c); doc.rect(x, y, w, h, 'F')
      }
      const strokeR = (x: number, y: number, w: number, h: number, c: [number,number,number], lw = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, y, w, h)
      }
      const circ = (x: number, y: number, r: number, c: [number,number,number]) => {
        doc.setFillColor(...c); doc.circle(x, y, r, 'F')
      }
      // Losango: 4 circulos sobrepostos formam um losango visual
      const diam = (x: number, y: number, s: number, c: [number,number,number]) => {
        const r = s * 0.55
        doc.setFillColor(...c)
        doc.circle(x,       y - s*0.45, r*0.7, 'F')
        doc.circle(x,       y + s*0.45, r*0.7, 'F')
        doc.circle(x - s*0.45*0.75, y, r*0.7, 'F')
        doc.circle(x + s*0.45*0.75, y, r*0.7, 'F')
        doc.circle(x, y, r*0.5, 'F')
      }
      // Coracao: 2 circulos + 1 elipse na base
      const heart = (x: number, y: number, s: number, c: [number,number,number]) => {
        doc.setFillColor(...c)
        doc.circle(x - s * 0.28, y - s * 0.08, s * 0.3, 'F')
        doc.circle(x + s * 0.28, y - s * 0.08, s * 0.3, 'F')
        // Base arredondada do coracao
        for (let i = 0; i <= 6; i++) {
          const t = (i / 6) * Math.PI
          const bx = x + Math.sin(t) * s * 0.5
          const by = y + s * 0.15 + (1 - Math.cos(t)) * s * 0.28
          doc.circle(bx, by, s * 0.18, 'F')
        }
      }
      const dashedH = (x1: number, y: number, x2: number, c: [number,number,number]) => {
        doc.setDrawColor(...c); doc.setLineWidth(0.25)
        for (let x = x1; x < x2; x += 3.5) doc.line(x, y, Math.min(x + 1.8, x2), y)
      }
      const solidH = (x1: number, y: number, x2: number, c: [number,number,number], w = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(x1, y, x2, y)
      }
      const solidV = (x: number, y1: number, y2: number, c: [number,number,number], w = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(x, y1, x, y2)
      }
      const txt = (t: string, x: number, y: number, size: number, c: [number,number,number],
        align: 'left'|'center'|'right' = 'left', maxW?: number, italic = false): number => {
        doc.setFontSize(size); doc.setTextColor(...c)
        doc.setFont('helvetica', italic ? 'italic' : 'normal')
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          return lines.length * (size * 0.42) + 1.5
        }
        doc.text(t, x, y, { align }); return size * 0.42 + 1.5
      }

      // Washi tape
      const washi = (y: number, c: [number,number,number], lighten = 55) => {
        const lc: [number,number,number] = [
          Math.min(255, c[0]+lighten), Math.min(255, c[1]+lighten), Math.min(255, c[2]+lighten)
        ]
        fillR(0, y, W, 5.5, lc)
      }

      // Tag colorida
      const tag = (label: string, x: number, y: number, c: [number,number,number] = ROSE_MID) => {
        const tw = label.length * 1.65 + 8
        fillR(x, y - 4, tw, 7, c)
        txt(label, x + 4, y + 0.5, 6, WHITE)
        return tw
      }

      // Stamp (borda)
      const stamp = (label: string, cx: number, y: number) => {
        const tw = label.length * 1.55 + 8
        strokeR(cx - tw/2, y - 4, tw, 7, ROSE_MID, 0.4)
        txt(label, cx, y + 0.5, 6, ROSE_MID, 'center')
      }

      // Fita adesiva simulada (retângulo translucido)
      const tape = (cx: number, y: number, w = 14, c: [number,number,number] = ROSE_CARD) => {
        const lc: [number,number,number] = [
          Math.min(255, c[0]+30), Math.min(255, c[1]+30), Math.min(255, c[2]+30)
        ]
        fillR(cx - w/2, y - 3, w, 5.5, lc)
        strokeR(cx - w/2, y - 3, w, 5.5, ROSE_LT, 0.2)
      }

      // Polaroid com foto real — com rotacao simulada via offset de sombra
      const polaroidPhoto = async (
        url: string | null,
        cx: number, cy: number,
        maxW: number, maxH: number,
        caption: string,
        angleDeg: number
      ) => {
        const pad = 5, capH = 13
        let imgW = maxW, imgH = maxH

        let imgData: string | null = null
        if (url) {
          try { imgData = await loadImage(url).catch(() => null) } catch {}
          if (imgData) {
            const tmpImg = new Image()
            await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = imgData! })
            const iw = tmpImg.naturalWidth || 4
            const ih = tmpImg.naturalHeight || 3
            const ratio = ih / iw
            imgH = Math.min(imgW * ratio, maxH)
          }
        }

        const frameW = imgW + pad * 2
        const frameH = imgH + pad + capH

        // offset para simular rotacao (inclinacao leve)
        const angle = angleDeg * Math.PI / 180
        const ox = Math.sin(angle) * frameH * 0.5
        const oy = -Math.cos(angle) * frameH * 0.05

        const fx = cx - frameW/2 + ox
        const fy = cy - frameH/2 + oy

        // Sombra simulada
        const sc: [number,number,number] = [200, 180, 188]
        fillR(fx + 2, fy + 2, frameW, frameH, sc)
        // Frame branco
        fillR(fx, fy, frameW, frameH, WHITE)
        strokeR(fx, fy, frameW, frameH, ROSE_LT, 0.2)

        if (imgData) {
          doc.addImage(imgData, 'JPEG', fx + pad, fy + pad, imgW, imgH, undefined, 'MEDIUM')
        } else {
          fillR(fx + pad, fy + pad, imgW, imgH, ROSE_CARD)
        }
        txt(caption, fx + frameW/2, fy + pad + imgH + 8, 6, GRAY, 'center', imgW, true)
        return { fx, fy, frameW, frameH, imgH }
      }

      // Dots row decorativos
      const dotRow = (cx: number, y: number, n = 3, r = 2.2, c1: [number,number,number] = ROSE_LT, c2: [number,number,number] = ROSE_CARD) => {
        for (let i = 0; i < n; i++) {
          circ(cx + (i - (n-1)/2) * (r*2+2), y, r, i % 2 === 0 ? c1 : c2)
        }
      }

      // Diamond row
      const diamRow = (cx: number, y: number, c1 = ROSE_LT, c2 = ROSE_CARD) => {
        diam(cx - 8, y, 2.5, c1); diam(cx, y, 2.5, c2); diam(cx + 8, y, 2.5, c1)
      }

      // ── CAPA ──────────────────────────────────────────────
      bg(ROSE_BG)

      // Bolhas de fundo
      circ(W - 18, 20, 18, [Math.min(255,ROSE_CARD[0]+20), Math.min(255,ROSE_CARD[1]+20), Math.min(255,ROSE_CARD[2]+20)])
      circ(10, H - 30, 12, ROSE_LT)
      circ(W - 35, H - 55, 22, [Math.min(255,ROSE_CARD[0]+25), Math.min(255,ROSE_CARD[1]+25), Math.min(255,ROSE_CARD[2]+25)])

      // Bloco topo escuro
      fillR(0, 0, W, 70, DARK)
      circ(W - 20, 18, 18, [90, 45, 70])
      circ(8, 58, 12, [80, 40, 62])
      txt('NOSSA', 16, 20, 7.5, ROSE_CARD)
      txt('Historia', 16, 46, 28, WHITE, 'left', undefined, true)
      txt('de amor', W - 14, 62, 8.5, ROSE_LT, 'right', undefined, true)

      // 2 polaroids na capa (sem fotos reais — placeholder)
      const cp1 = await polaroidPhoto(null, 58, 128, 78, 58, 'nosso momento', -5)
      const cp2 = await polaroidPhoto(null, 148, 138, 68, 52, 'para sempre', 4)

      // Nome e data
      dashedH(14, 196, W - 14, ROSE_MID)
      txt('Roberto e Rosana', W/2, 207, 14, DARK, 'center', undefined, true)
      stamp('4 DE ABRIL DE 2025', W/2, 218)
      dotRow(W/2, 228, 3, 2, ROSE_LT, ROSE_CARD)

      washi(H - 14, ROSE_MID)
      txt('Nossa Historia  -  uma vida juntos', W/2, H - 8, 6.5, ROSE_MID, 'center')

      // ── MOMENTOS ──────────────────────────────────────────
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' }).toUpperCase()

        doc.addPage()
        bg(ROSE_BG)

        if (m.photo_url) {
          // Decoracoes de fundo
          circ(W - 14, H - 20, 13, [Math.min(255,ROSE_CARD[0]+20), Math.min(255,ROSE_CARD[1]+20), Math.min(255,ROSE_CARD[2]+20)])
          circ(8, 62, 8, ROSE_LT)

          washi(12, ROSE_LT)

          let y = 25
          tag(dateStr, 14, y); y += 12
          y += txt(m.title, 14, y, 18, DARK, 'left', W - 28, true)
          y += 6

          // Polaroid centralizado com foto real
          const maxPW = W - 32
          const maxPH = m.description ? 142 : 168
          const p = await polaroidPhoto(m.photo_url, W/2, y + maxPH/2, maxPW, maxPH, m.title.toLowerCase(), -2)
          y = p.fy + p.frameH + 8

          if (m.description) {
            solidV(14, y, y + 18, ROSE_MID, 1.5)
            txt(m.description, 20, y + 5, 9, ROSE_MID, 'left', W - 34, true)
          }

          heart(W - 9, H - 18, 3.5, ROSE_CARD)
          diam(8, H - 15, 2, ROSE_LT)

        } else {
          // Sem foto — card criativo estilo scrapbook
          circ(W - 16, 30, 20, [Math.min(255,ROSE_CARD[0]+20), Math.min(255,ROSE_CARD[1]+20), Math.min(255,ROSE_CARD[2]+20)])
          circ(10, H - 28, 14, ROSE_LT)
          heart(W - 9, H - 14, 4.5, ROSE_CARD)
          diam(8, 22, 2.5, ROSE_LT)

          washi(12, ROSE_CARD)

          // Card branco com borda tracejada centralizado
          const cardX = 16, cardW = W - 32
          const titleLines = doc.setFontSize(20).splitTextToSize(m.title, cardW - 20).length
          const descLines = m.description ? doc.setFontSize(9).splitTextToSize(m.description, cardW - 20).length : 0
          const cardH = 20 + titleLines * 9 + (descLines > 0 ? descLines * 5 + 16 : 0) + 16
          const cardY = (H - cardH) / 2

          // Sombra do card
          fillR(cardX + 2, cardY + 2, cardW, cardH, ROSE_LT)

          // Card branco
          fillR(cardX, cardY, cardW, cardH, WHITE)
          doc.setDrawColor(...ROSE_MID); doc.setLineWidth(0.4)
          // Borda tracejada manual
          for (let x = cardX; x < cardX + cardW; x += 3.5) doc.line(x, cardY, Math.min(x+2, cardX+cardW), cardY)
          for (let x = cardX; x < cardX + cardW; x += 3.5) doc.line(x, cardY+cardH, Math.min(x+2, cardX+cardW), cardY+cardH)
          for (let y2 = cardY; y2 < cardY + cardH; y2 += 3.5) doc.line(cardX, y2, cardX, Math.min(y2+2, cardY+cardH))
          for (let y2 = cardY; y2 < cardY + cardH; y2 += 3.5) doc.line(cardX+cardW, y2, cardX+cardW, Math.min(y2+2, cardY+cardH))

          // Fitas adesivas no topo do card
          tape(cardX + cardW * 0.25, cardY, 14, ROSE_CARD)
          tape(cardX + cardW * 0.75, cardY, 14, ROSE_LT)

          // Conteudo do card
          let cy = cardY + 14
          tag(dateStr, cardX + 10, cy, ROSE_MID); cy += 11

          // Linha decorativa
          solidH(cardX + 10, cy, cardX + 10 + 14, cy, ROSE_LT); cy += 6

          cy += txt(m.title, cardX + 10, cy, 20, DARK, 'left', cardW - 20, true)

          if (m.description) {
            cy += 4
            solidH(cardX + 10, cy, cardX + 10 + 18, cy, ROSE_CARD); cy += 6
            txt(m.description, cardX + 10, cy, 9, GRAY, 'left', cardW - 20, true)
          }

          // Dots no canto inferior do card
          dotRow(cardX + cardW - 18, cardY + cardH - 8, 3, 1.8, ROSE_LT, ROSE_CARD)
        }
      }

      // ── SEPARADOR CAPITULO ────────────────────────────────
      const chapterPage = (title: string) => {
        doc.addPage(); bg(ROSE_BG)
        circ(W/2, H/2, 38, [Math.min(255,ROSE_CARD[0]+20), Math.min(255,ROSE_CARD[1]+20), Math.min(255,ROSE_CARD[2]+20)])
        circ(18, 38, 14, ROSE_LT)
        circ(W - 18, H - 38, 16, ROSE_LT)
        heart(W/2 - 8, 28, 3.5, ROSE_LT)
        heart(W/2 + 8, 28, 3.5, ROSE_LT)
        heart(W/2, 34, 3, ROSE_CARD)
        diamRow(W/2, H - 22)
        txt('CAPITULO', W/2, 114, 7, SILVER, 'center')
        solidH(W/2 - 20, 119, W/2 + 20, ROSE_LT, 0.4)
        txt(title, W/2, 134, 20, DARK, 'center', W - 40, true)
        solidH(W/2 - 20, 140, W/2 + 20, ROSE_LT, 0.4)
        txt('uma historia de amor', W/2, 151, 7, GRAY, 'center', undefined, true)
        diamRow(W/2, H - 22)
      }

      // ── CARTA ─────────────────────────────────────────────
      if (letters.wedding?.text) {
        chapterPage('Nossa Carta')

        doc.addPage(); bg(ROSE_BG)
        circ(W - 16, H - 26, 16, ROSE_LT)
        circ(10, 40, 10, [Math.min(255,ROSE_CARD[0]+20), Math.min(255,ROSE_CARD[1]+20), Math.min(255,ROSE_CARD[2]+20)])

        washi(12, ROSE_MID)
        fillR(14, 24, W - 28, 10, ROSE_MID)
        circ(20, 30, 2.5, WHITE)
        txt('CARTA DO CASAMENTO', 26, 31, 7, WHITE)

        dashedH(14, 40, W - 14, ROSE_LT)

        // Card da carta
        const cCardH = H - 86
        fillR(16, 44, W - 32, cCardH, WHITE)
        strokeR(16, 44, W - 32, cCardH, ROSE_LT, 0.3)
        tape(W/2 - 16, 44, 14, ROSE_CARD)
        tape(W/2 + 16, 44, 14, ROSE_LT)

        txt(letters.wedding.text, 22, 58, 9.5, DARK, 'left', W - 44, true)

        dotRow(W/2, H - 26, 3, 2.2, ROSE_LT, ROSE_CARD)
        heart(W - 16, H - 26, 3, ROSE_CARD)
      }

      // ── CONVIDADOS ────────────────────────────────────────
      if (guestPosts.length > 0) {
        chapterPage('Mensagens da Familia')
        doc.addPage(); bg(ROSE_BG)
        washi(12, ROSE_LT)
        let y = 26
        for (const p of guestPosts) {
          if (y > 258) { doc.addPage(); bg(ROSE_BG); washi(12, ROSE_LT); y = 26 }
          dashedH(14, y, W - 14, ROSE_LT); y += 6
          y += txt(p.name, 14, y, 11, ROSE_MID, 'left', undefined, true)
          y += txt(p.message, 14, y, 9, GRAY, 'left', W - 28, true) + 8
        }
      }

      // ── PAGINA FINAL ──────────────────────────────────────
      doc.addPage(); bg(ROSE_BG)
      circ(W/2, H/2 - 12, 44, [Math.min(255,ROSE_CARD[0]+20), Math.min(255,ROSE_CARD[1]+20), Math.min(255,ROSE_CARD[2]+20)])
      circ(12, 28, 10, ROSE_LT)
      circ(W - 12, H - 28, 14, ROSE_LT)
      diam(10, H - 18, 3, ROSE_LT); diam(W - 10, 18, 3, ROSE_LT)

      dotRow(W/2, 104, 3, 2.5, ROSE_LT, ROSE_CARD)
      heart(W/2, 116, 7, ROSE_CARD)
      txt(couple?.couple_name || 'Nossa Historia', W/2, 144, 18, DARK, 'center', undefined, true)
      solidH(W/2 - 18, 150, W/2 + 18, ROSE_LT, 0.4)
      txt('NOSSA HISTORIA  ' + new Date().getFullYear(), W/2, 160, 7, SILVER, 'center')
      diamRow(W/2, 172)

      washi(H - 14, ROSE_MID)
      txt('feito com amor', W/2, H - 8, 6.5, ROSE_MID, 'center')

      doc.save(`nossa-historia-${(couple?.couple_name||'casal').replace(/\s/g,'-')}.pdf`)
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
            Album estilo scrapbook com polaroids, fitas decorativas e toda a historia de voces.
          </p>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'fotos em polaroid inclinado' },
            { icon: '💌', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita' : 'nao escrita ainda' },
            { icon: '👨‍👩‍👧', label: `${guestPosts.length} mensagens`, sub: 'do album de convidados' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#E8C4CE' }}>
              <span className="text-xl w-8">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#9B6B7A' }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={generatePDF} disabled={generating || done} className="btn-primary disabled:opacity-60 py-4 text-base">
          {done ? 'PDF baixado!' : generating ? 'Gerando PDF...' : 'Gerar e baixar PDF'}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: '#C9A0B0' }}>
          O PDF e gerado no seu celular - nenhum dado sai do seu dispositivo
        </p>
      </div>
    </Layout>
  )
}
