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
<<<<<<< HEAD
  const [letters, setLetters] = useState<Record<string,any>>({})
=======
  const [letters, setLetters] = useState<Record<string, any>>({})
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)
  const guestPosts: any[] = []

  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
    lettersService.getAll().then(res => {
      const map: Record<string, any> = {}
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
<<<<<<< HEAD
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
          solidH(cardX + 10, cy, cardX + 24, ROSE_LT); cy += 6

          cy += txt(m.title, cardX + 10, cy, 20, DARK, 'left', cardW - 20, true)

          if (m.description) {
            cy += 4
            solidH(cardX + 10, cy, cardX + 28, ROSE_CARD); cy += 6
            txt(m.description, cardX + 10, cy, 9, GRAY, 'left', cardW - 20, true)
          }

          // Dots no canto inferior do card
          dotRow(cardX + cardW - 18, cardY + cardH - 8, 3, 1.8, ROSE_LT, ROSE_CARD)
=======
      const DARK_GREEN  = [42,  55,  38]  as [number,number,number]
      const ROSE_DARK   = [120, 60,  80]  as [number,number,number]
      const ROSE_MID    = [180, 100, 130] as [number,number,number]
      const ROSE_LT     = [230, 190, 205] as [number,number,number]
      const CREAM       = [255, 248, 245] as [number,number,number]
      const BLUSH       = [248, 225, 230] as [number,number,number]
      const WHITE       = [255, 255, 255] as [number,number,number]
      const GOLD        = [190, 155, 100] as [number,number,number]
      const GRAY        = [130, 100, 110] as [number,number,number]

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

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
      const solidH = (x1: number, y: number, x2: number, c: [number,number,number], w = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(x1, y, x2, y)
      }
      const txt = (t: string, x: number, y: number, size: number, c: [number,number,number],
        align: 'left'|'center'|'right' = 'left', maxW?: number, italic = false): number => {
        doc.setFontSize(size); doc.setTextColor(...c)
        doc.setFont('helvetica', italic ? 'italic' : 'normal')
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          return lines.length * (size * 0.42) + 2
        }
        doc.text(t, x, y, { align }); return size * 0.42 + 2
      }
      const boldTxt = (t: string, x: number, y: number, size: number, c: [number,number,number],
        align: 'left'|'center'|'right' = 'left', maxW?: number): number => {
        doc.setFontSize(size); doc.setTextColor(...c)
        doc.setFont('helvetica', 'bold')
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          return lines.length * (size * 0.42) + 2
        }
        doc.text(t, x, y, { align }); return size * 0.42 + 2
      }

      const heart = (x: number, y: number, s: number, c: [number,number,number]) => {
        doc.setFillColor(...c)
        doc.circle(x - s*0.28, y - s*0.08, s*0.3, 'F')
        doc.circle(x + s*0.28, y - s*0.08, s*0.3, 'F')
        for (let i = 0; i <= 8; i++) {
          const t2 = (i/8)*Math.PI
          doc.circle(x + Math.sin(t2)*s*0.5, y + s*0.15 + (1-Math.cos(t2))*s*0.28, s*0.18, 'F')
        }
      }
      const leaf = (x: number, y: number, s: number, c: [number,number,number]) => {
        doc.setFillColor(...c)
        doc.circle(x, y, s*0.6, 'F')
        doc.circle(x + s*0.5, y - s*0.5, s*0.45, 'F')
      }
      const tag = (label: string, x: number, y: number, c: [number,number,number] = ROSE_DARK) => {
        const tw = label.length*1.55 + 7
        fillR(x, y-4, tw, 7, c)
        txt(label, x+3.5, y+0.5, 5.5, WHITE)
        return tw
      }
      const tape = (cx: number, y: number, w = 16, c: [number,number,number] = BLUSH) => {
        const lc: [number,number,number] = [Math.min(255,c[0]+20), Math.min(255,c[1]+20), Math.min(255,c[2]+20)]
        fillR(cx-w/2, y-3, w, 5.5, lc)
        strokeR(cx-w/2, y-3, w, 5.5, ROSE_LT, 0.15)
      }
      const heartRow = (cx: number, y: number, n = 7, c: [number,number,number] = ROSE_LT) => {
        for (let i = 0; i < n; i++) heart(cx + (i-(n-1)/2)*5, y, 1.2, c)
      }

      // Quadro de foto estilo folheto com moldura elegante
      const photoFrame = async (
        url: string|null, fx: number, fy: number, fw: number, fh: number,
        caption: string, borderColor: [number,number,number] = WHITE,
        shadowColor: [number,number,number] = ROSE_LT, tapeTop = true
      ) => {
        const PAD = 5, CAP_H = 11
        const totalH = fh + PAD*2 + CAP_H

        // Sombra
        fillR(fx+2.5, fy+2.5, fw+PAD*2, totalH, shadowColor)
        // Moldura branca elegante
        fillR(fx, fy, fw+PAD*2, totalH, borderColor)
        strokeR(fx, fy, fw+PAD*2, totalH, ROSE_LT, 0.2)

        // Enfeites nos cantos (pontinho colorido)
        const cs = 2
        fillR(fx-0.5, fy-0.5, cs, cs, ROSE_MID)
        fillR(fx+fw+PAD*2-cs+0.5, fy-0.5, cs, cs, ROSE_MID)
        fillR(fx-0.5, fy+totalH-cs+0.5, cs, cs, ROSE_MID)
        fillR(fx+fw+PAD*2-cs+0.5, fy+totalH-cs+0.5, cs, cs, ROSE_MID)

        // Fita adesiva no topo
        if (tapeTop) tape(fx+(fw+PAD*2)/2, fy, 18, BLUSH)

        // Foto
        let imgData: string|null = null
        let imgH = fh
        if (url) {
          try { imgData = await loadImage(url).catch(() => null) } catch {}
          if (imgData) {
            const tmpImg = new Image()
            await new Promise(r => { tmpImg.onload=r; tmpImg.onerror=r; tmpImg.src=imgData! })
            const iw = tmpImg.naturalWidth||4, ih = tmpImg.naturalHeight||3
            imgH = Math.min(fw*(ih/iw), fh)
          }
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)
        }

        const imgY = fy+PAD
        if (imgData) {
          fillR(fx+PAD, imgY, fw, fh, [220,210,215])
          doc.addImage(imgData,'JPEG',fx+PAD,imgY+(fh-imgH)/2,fw,imgH,undefined,'MEDIUM')
        } else {
          fillR(fx+PAD, imgY, fw, fh, BLUSH)
          heart(fx+PAD+fw/2, imgY+fh/2, 6, ROSE_LT)
        }

        // Legenda
        txt(caption.toLowerCase(), fx+(fw+PAD*2)/2, fy+PAD+fh+7, 6, GRAY, 'center', fw+PAD*2-4, true)

        return { bottomY: fy+totalH }
      }

<<<<<<< HEAD
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
=======
      // ── CAPA ──────────────────────────────────────────────
      bg(CREAM)
      fillR(0, 0, 70, H, DARK_GREEN)

      // Folhas decorativas
      leaf(15, 18, 6, [55,75,48]); leaf(58, 30, 4, [55,75,48])
      leaf(8, H-20, 5, [55,75,48]); leaf(62, H-35, 4, [55,75,48])
      heart(35, H-60, 5, ROSE_MID); heart(20, H-75, 3, ROSE_LT); heart(50, H-70, 3, ROSE_LT)

      // Título no painel verde
      boldTxt('NOSSA', 10, 38, 13, CREAM)
      boldTxt('História', 10, 58, 22, WHITE)
      txt('de amor', 10, 74, 9, ROSE_LT, 'left', undefined, true)
      solidH(10, 82, 60, ROSE_MID, 0.5)
      txt('nosso momento', 10, 91, 6.5, ROSE_LT, 'left', undefined, true)
      txt('para sempre', 10, 99, 6.5, ROSE_LT, 'left', undefined, true)

      // Círculo decorativo
      circ(35, 155, 30, [60,40,55])
      heart(35, 155, 8, ROSE_MID)
      boldTxt('HAPPY', 10, H-35, 7, CREAM); boldTxt('FOREVER', 10, H-26, 7, CREAM)

      // Quadros de foto na área creme
      const f1 = await photoFrame(null, 82, 20, 58, 46, 'nosso momento', WHITE, ROSE_LT, true)
      const f2 = await photoFrame(null, 148, 40, 50, 40, 'para sempre', WHITE, BLUSH, true)
      const midY = Math.max(f1.bottomY, f2.bottomY)+8

      solidH(82, midY, 198, ROSE_MID, 0.4)
      boldTxt('ACOMPANHAMOS', 140, midY+8, 8, DARK_GREEN, 'center')
      boldTxt('CADA MOMENTO', 140, midY+16, 8, DARK_GREEN, 'center')
      solidH(82, midY+20, 198, ROSE_LT, 0.3)
      heartRow(140, midY+28, 7, ROSE_DARK)

      txt('Roberto e Rosana', 140, midY+42, 14, DARK_GREEN, 'center', undefined, true)
      solidH(90, midY+46, 190, GOLD, 0.4)
      fillR(100, midY+50, 80, 9, ROSE_DARK)
      txt('4 DE ABRIL DE 2025', 140, midY+56, 6.5, WHITE, 'center')

      circ(162, midY+90, 30, ROSE_DARK)
      circ(162, midY+90, 28, [145,80,100])
      heart(162, midY+90, 8, ROSE_LT)

      solidH(82, midY+128, 198, ROSE_LT, 0.3)
      txt('HAPPY  FOREVER', 140, midY+137, 9, ROSE_DARK, 'center')
      heartRow(140, midY+144, 5, ROSE_LT)

      fillR(0, H-18, W, 18, DARK_GREEN)
      leaf(W-15, H-10, 3, [55,75,48])
      txt('Nossa Historia  •  uma vida juntos', W/2, H-8, 6.5, ROSE_LT, 'center')

      // ── MOMENTOS ──────────────────────────────────────────
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase()

        doc.addPage(); bg(CREAM)

        // Faixa de topo
        fillR(0, 0, W, 22, DARK_GREEN)
        tag(dateStr, 10, 14, ROSE_MID)
        heart(W-12, 11, 3, ROSE_LT); heart(W-20, 11, 2.5, ROSE_LT)

        let y = 32
        y += boldTxt(m.title, W/2, y, 18, DARK_GREEN, 'center', W-28)
        solidH(20, y, W-20, ROSE_LT, 0.4); y += 6

        if (m.photo_url) {
          // Quadro principal com foto real
          const mainFH = m.description ? 110 : 140
          const res = await photoFrame(m.photo_url, 20, y, W-40, mainFH, m.title, WHITE, ROSE_LT, true)
          y = res.bottomY+8

          if (m.description) {
            fillR(14, y, W-28, 4, ROSE_DARK); y += 7
            txt(m.description, W/2, y, 9.5, GRAY, 'center', W-32, true)
          }
        } else {
          // Card sem foto
          fillR(16, y, 3, 60, ROSE_DARK)
          txt(m.description||'Um momento especial', 24, y+8, 10, GRAY, 'left', W-38, true)
          y += 60
        }

        heartRow(W/2, H-22, 7, ROSE_LT)
        fillR(0, H-14, W, 14, DARK_GREEN)
        leaf(W-12, H-8, 2.5, [55,75,48])
        txt('nossa história  •  '+(couple?.couple_name||'Roberto e Rosana'), W/2, H-7, 6, ROSE_LT, 'center')
      }

      // ── CAPÍTULO ──────────────────────────────────────────
      const chapterPage = (title: string) => {
        doc.addPage(); bg(CREAM)
        fillR(0, 0, 68, H, DARK_GREEN)
        leaf(15, 20, 7, [55,75,48]); leaf(55, 40, 4, [55,75,48])
        leaf(10, H-30, 6, [55,75,48]); leaf(58, H-50, 4, [55,75,48])
        heart(34, H/2, 7, ROSE_MID)
        circ(W/2+5, H/2, 36, BLUSH)
        solidH(78, H/2-24, W-14, ROSE_LT, 0.3)
        txt('CAPÍTULO', W/2+5, H/2-16, 7, ROSE_MID, 'center')
        boldTxt(title, W/2+5, H/2+2, 18, DARK_GREEN, 'center', W-100)
        solidH(78, H/2+10, W-14, ROSE_LT, 0.3)
        txt('uma história de amor', W/2+5, H/2+20, 7.5, GRAY, 'center', undefined, true)
        heartRow(W/2+5, H/2+32, 5, ROSE_MID)
      }

      // ── CARTA ─────────────────────────────────────────────
      if (letters.wedding?.text) {
        chapterPage('Nossa Carta')
        doc.addPage(); bg(CREAM)

        // Barra lateral esquerda vinho
        fillR(0, 0, 18, H, ROSE_DARK)
        for (let yy = 20; yy < H-20; yy += 12) heart(9, yy, 2, ROSE_MID)

        fillR(22, 14, W-30, 14, DARK_GREEN)
        circ(30, 21, 3.5, ROSE_LT)
        boldTxt('CARTA DO CASAMENTO', 36, 23, 7.5, WHITE)
        solidH(22, 32, W-8, ROSE_LT, 0.3)
        tape(80, 44, 16, BLUSH); tape(145, 44, 16, ROSE_LT)
        fillR(22, 46, W-30, H-76, WHITE)
        strokeR(22, 46, W-30, H-76, ROSE_LT, 0.3)
        for (let ly = 62; ly < H-30; ly += 8) solidH(26, ly, W-12, [240,225,230], 0.15)
        txt(letters.wedding.text, 28, 60, 9.5, DARK_GREEN, 'left', W-46, false)

        heartRow(W/2, H-22, 7, ROSE_LT)
        fillR(0, H-14, W, 14, DARK_GREEN)
        txt('feito com amor  •  nossa história', W/2, H-7, 6, ROSE_LT, 'center')
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)
      }

      // ── CONVIDADOS ────────────────────────────────────────
      if (guestPosts.length > 0) {
<<<<<<< HEAD
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
=======
        chapterPage('Mensagens da Família')
        doc.addPage(); bg(CREAM)
        fillR(0, 0, W, 22, ROSE_DARK)
        tag('MENSAGENS', 10, 14, DARK_GREEN)
        let gy = 32
        for (const p of guestPosts) {
          if (gy > 258) { doc.addPage(); bg(CREAM); fillR(0,0,W,22,ROSE_DARK); gy=32 }
          solidH(14, gy, W-14, ROSE_LT, 0.3); gy += 6
          gy += boldTxt(p.name, 14, gy, 11, ROSE_DARK, 'left')
          gy += txt(p.message, 14, gy, 9, GRAY, 'left', W-28, true)+8
        }
      }

      // ── PÁGINA FINAL ──────────────────────────────────────
      doc.addPage(); bg(CREAM)
      fillR(0, 0, 68, H, DARK_GREEN)
      leaf(15, 18, 6, [55,75,48]); leaf(58, 30, 4, [55,75,48])
      leaf(8, H-20, 5, [55,75,48]); leaf(62, H-35, 4, [55,75,48])
      heart(34, H/2-20, 8, ROSE_MID); heart(34, H/2+5, 5, ROSE_LT); heart(34, H/2+25, 3, ROSE_LT)
      boldTxt('HAPPY', 10, H-42, 9, CREAM); boldTxt('FOREVER', 10, H-31, 9, CREAM)

      circ(W/2+5, H/2-10, 40, BLUSH)
      heartRow(W/2+5, H/2-38, 5, ROSE_LT)
      heart(W/2+5, H/2-20, 10, ROSE_DARK)
      boldTxt(couple?.couple_name||'Nossa História', W/2+5, H/2+8, 18, DARK_GREEN, 'center', W-100)
      solidH(78, H/2+15, W-14, GOLD, 0.4)
      txt('NOSSA HISTORIA  '+new Date().getFullYear(), W/2+5, H/2+24, 7, GRAY, 'center')
      heartRow(W/2+5, H/2+35, 7, ROSE_MID)

      fillR(0, H-18, W, 18, DARK_GREEN)
      leaf(W-12, H-10, 3, [55,75,48])
      txt('feito com amor  •  nossa história', W/2, H-8, 6.5, ROSE_LT, 'center')
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)

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
<<<<<<< HEAD
            Album estilo scrapbook com polaroids, fitas decorativas e toda a historia de voces.
=======
            Álbum estilo folheto elegante, com fotos em molduras, decorações e toda a história de vocês.
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)
          </p>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
<<<<<<< HEAD
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'fotos em polaroid inclinado' },
            { icon: '💌', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita' : 'nao escrita ainda' },
            { icon: '👨‍👩‍👧', label: `${guestPosts.length} mensagens`, sub: 'do album de convidados' },
=======
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name||'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'fotos em molduras elegantes' },
            { icon: '💌', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita' : 'não escrita ainda' },
            { icon: '👨‍👩‍👧', label: `${guestPosts.length} mensagens`, sub: 'do álbum de convidados' },
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)
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
<<<<<<< HEAD
        <button onClick={generatePDF} disabled={generating || done} className="btn-primary disabled:opacity-60 py-4 text-base">
          {done ? 'PDF baixado!' : generating ? 'Gerando PDF...' : 'Gerar e baixar PDF'}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: '#C9A0B0' }}>
          O PDF e gerado no seu celular - nenhum dado sai do seu dispositivo
=======
        <button onClick={generatePDF} disabled={generating||done} className="btn-primary disabled:opacity-60 py-4 text-base">
          {done ? '✓ PDF baixado!' : generating ? 'Gerando PDF...' : 'Gerar e baixar PDF'}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: '#C9A0B0' }}>
          O PDF é gerado no seu celular — nenhum dado sai do seu dispositivo
>>>>>>> 7d844ba5 (frontend/src/pages/BookPDF.tsx)
        </p>
      </div>
    </Layout>
  )
}
