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
  const [letters, setLetters] = useState<Record<string, any>>({})
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
      const M = 14

      const DG    = [42,  58,  38]  as [number,number,number]
      const DG2   = [55,  75,  48]  as [number,number,number]
      const WINE  = [110, 50,  70]  as [number,number,number]
      const ROSE  = [180, 100, 130] as [number,number,number]
      const BLUSH = [240, 218, 225] as [number,number,number]
      const CREAM = [255, 248, 244] as [number,number,number]
      const WHITE = [255, 255, 255] as [number,number,number]
      const GOLD  = [185, 148, 88]  as [number,number,number]
      const GRAY  = [120, 95,  108] as [number,number,number]

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
      const ln = (x1: number, y1: number, x2: number, y2: number, c: [number,number,number], lw = 0.3) => {
        doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2)
      }
      const T = (t: string, x: number, y: number, size: number, c: [number,number,number],
        align: 'left'|'center'|'right' = 'left', maxW?: number, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal'
      ): number => {
        doc.setFontSize(size); doc.setTextColor(...c); doc.setFont('helvetica', style)
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          return lines.length * (size * 0.42) + 2.5
        }
        doc.text(t, x, y, { align }); return size * 0.42 + 2.5
      }

      // Coração desenhado com bezier path via canvas SVG → dataURL → addImage
      // Mais confiável que Unicode em jsPDF
      const heartImg = (cx: number, cy: number, r: number, c: [number,number,number]) => {
        const sz = Math.round(r * 8)
        const cv = document.createElement('canvas')
        cv.width = sz; cv.height = sz
        const ctx = cv.getContext('2d')!
        const x = sz/2, y = sz*0.52
        const w = sz*0.46
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.bezierCurveTo(x, y - w*0.3, x - w, y - w*0.8, x - w, y - w*0.35)
        ctx.bezierCurveTo(x - w, y - w*0.9, x - w*0.15, y - w*1.1, x, y - w*0.55)
        ctx.bezierCurveTo(x + w*0.15, y - w*1.1, x + w, y - w*0.9, x + w, y - w*0.35)
        ctx.bezierCurveTo(x + w, y - w*0.8, x, y - w*0.3, x, y)
        ctx.closePath()
        ctx.fill()
        const data = cv.toDataURL('image/png')
        const d = r * 2
        doc.addImage(data, 'PNG', cx - r, cy - r * 1.1, d, d)
      }

      // Fileira de corações
      const heartRow = (startX: number, y: number, n: number, r: number, c: [number,number,number]) => {
        const gap = r * 2.6
        const totalW = (n - 1) * gap
        for (let i = 0; i < n; i++) heartImg(startX - totalW/2 + i*gap, y, r, c)
      }

      // Folha
      const leaf = (x: number, y: number, s: number, c: [number,number,number], angle = 0) => {
        doc.setFillColor(...c)
        const rad = angle * Math.PI / 180
        doc.circle(x, y, s*0.65, 'F')
        doc.circle(x + Math.cos(rad)*s*0.5, y - Math.sin(rad)*s*0.5, s*0.5, 'F')
      }

      const badge = (label: string, x: number, y: number, c: [number,number,number] = WINE) => {
        const tw = label.length * 1.45 + 8
        fillR(x, y-4.5, tw, 8, c)
        T(label, x+4, y+0.8, 5.5, WHITE)
        return tw
      }

      const tape = (cx: number, y: number, w = 18, c: [number,number,number] = BLUSH) => {
        const lc: [number,number,number] = [Math.min(255,c[0]+30), Math.min(255,c[1]+30), Math.min(255,c[2]+30)]
        fillR(cx-w/2, y-3, w, 5.5, lc)
        strokeR(cx-w/2, y-3, w, 5.5, [Math.max(0,c[0]-25), Math.max(0,c[1]-25), Math.max(0,c[2]-25)], 0.15)
      }

      // POLAROID
      const polaroid = async (
        url: string | null,
        fx: number, fy: number,
        imgW: number, imgH: number,
        caption: string,
        tapeColor: [number,number,number] = BLUSH
      ) => {
        const PS = 5, PT = 5, PB = 18
        const fw = imgW + PS*2
        const fh = imgH + PT + PB

        fillR(fx+3, fy+3, fw, fh, [170, 148, 160])
        fillR(fx, fy, fw, fh, WHITE)
        strokeR(fx, fy, fw, fh, [190, 168, 180], 0.25)
        fillR(fx-1.5, fy-1.5, 4, 4, ROSE)
        fillR(fx+fw-2.5, fy-1.5, 4, 4, ROSE)
        fillR(fx-1.5, fy+fh-2.5, 4, 4, ROSE)
        fillR(fx+fw-2.5, fy+fh-2.5, 4, 4, ROSE)
        tape(fx+fw/2, fy, 22, tapeColor)

        const px = fx + PS, py = fy + PT

        let croppedData: string | null = null
        if (url) {
          try {
            const rawData = await loadImage(url).catch(() => null)
            if (rawData) {
              const tmp = new Image()
              await new Promise(r => { tmp.onload=r; tmp.onerror=r; tmp.src=rawData })
              const iw = tmp.naturalWidth||4, ih = tmp.naturalHeight||3
              const scale = Math.max(imgW/iw, imgH/ih)
              const dw = iw*scale, dh = ih*scale
              const offX = (dw-imgW)/2, offY = (dh-imgH)/2
              const RES = 3
              const cc = document.createElement('canvas')
              cc.width = Math.round(imgW*RES); cc.height = Math.round(imgH*RES)
              cc.getContext('2d')!.drawImage(tmp, 0, 0, iw, ih, -offX*RES, -offY*RES, dw*RES, dh*RES)
              croppedData = cc.toDataURL('image/jpeg', 0.92)
            }
          } catch {}
        }

        if (croppedData) {
          doc.addImage(croppedData, 'JPEG', px, py, imgW, imgH, undefined, 'MEDIUM')
        } else {
          fillR(px, py, imgW, imgH, BLUSH)
          heartImg(px+imgW/2, py+imgH/2, 7, [210, 185, 200])
        }

        T(caption.toLowerCase(), fx+fw/2, fy+PT+imgH+12, 7, GRAY, 'center', fw-4, 'italic')
        return { bottomY: fy+fh, fw, fh }
      }

      // Painel verde
      const PW = 70
      const greenPanel = () => {
        fillR(0, 0, PW, H, DG)
        leaf(PW*0.22, 20, 7, DG2, 45); leaf(PW*0.75, 36, 5, DG2, -30)
        leaf(PW*0.18, H-30, 6, DG2, 135); leaf(PW*0.7, H-44, 4, DG2, -120)
        leaf(PW*0.5, 88, 3, DG2, 60); leaf(PW*0.3, H/2+28, 3.5, DG2, -60)
      }

      const greenFooter = () => {
        fillR(0, H-16, W, 16, DG)
        heartImg(W-10, H-8, 2, DG2)
        heartImg(W-18, H-8, 1.8, DG2)
        T('feito com amor  -  nossa historia', W/2, H-5.5, 6, BLUSH, 'center')
      }

      // Preenche espaço vazio com decoração texto (sem corações — só texto)
      const fillEmpty = (startY: number, endY: number) => {
        if (endY - startY < 20) return
        const mid = (startY + endY) / 2
        ln(M*2, startY+6, W-M*2, startY+6, BLUSH, 0.3)
        T('LOVE', W/2 - 28, startY+16, 10, BLUSH, 'center', undefined, 'bold')
        T('AMOR', W/2,      startY+16, 10, [228,205,215], 'center', undefined, 'bold')
        T('LOVE', W/2 + 28, startY+16, 10, BLUSH, 'center', undefined, 'bold')
        T('para sempre juntos', W/2, mid, 11, [230,208,218], 'center', undefined, 'bolditalic')
        T('AMOR', W/2 - 22, mid+14, 9, BLUSH, 'center', undefined, 'bold')
        T('LOVE', W/2 + 22, mid+14, 9, [228,205,215], 'center', undefined, 'bold')
        ln(M*2, endY-6, W-M*2, endY-6, BLUSH, 0.3)
      }

      // ══════════════════════════════════════════
      // CAPA
      // ══════════════════════════════════════════
      bg(CREAM)
      greenPanel()
      T('NOSSA',    10, 52, 14, BLUSH, 'left', undefined, 'bold')
      T('Historia', 8,  74, 27, WHITE, 'left', undefined, 'bolditalic')
      T('de amor',  10, 92, 9,  BLUSH, 'left', undefined, 'italic')
      ln(8, 100, PW-8, 100, BLUSH, 0.4)
      heartImg(PW/2, H/2-14, 8, WINE)
      heartImg(PW/2, H/2+8,  5, ROSE)
      heartImg(PW/2, H/2+22, 3, BLUSH)
      T('HAPPY',   8, H-40, 9, CREAM, 'left', undefined, 'bold')
      T('FOREVER', 8, H-29, 9, CREAM, 'left', undefined, 'bold')

      const CA = PW + M
      const CW = W - PW - M*2
      const cx = CA + CW/2

      const pSmall = Math.floor((CW - 6) / 2)
      const f1 = await polaroid(null, CA,           22, pSmall, 44, 'nosso momento', BLUSH)
      const f2 = await polaroid(null, CA+pSmall+16, 34, pSmall, 38, 'para sempre',   [218,200,212])
      const midY = Math.max(f1.bottomY, f2.bottomY) + 10

      ln(CA, midY, W-M, midY, GOLD, 0.5)
      T('WE ACCOMPANY YOU', cx, midY+9, 7.5, WINE, 'center', CW, 'bold')
      heartRow(cx, midY+18, 5, 1.6, ROSE)
      const coupleName = couple?.couple_name || 'Roberto e Rosana'
      T(coupleName, cx, midY+30, 15, DG, 'center', CW, 'bolditalic')
      ln(CA, midY+36, W-M, midY+36, GOLD, 0.4)
      fillR(CA+8, midY+40, CW-16, 10, WINE)
      T('4 DE ABRIL DE 2025', cx, midY+47, 7, WHITE, 'center')
      circ(cx, midY+80, 26, [233,212,220])
      circ(cx, midY+80, 21, [244,226,232])
      heartImg(cx, midY+80, 9, WINE)
      heartRow(cx, midY+108, 7, 1.4, ROSE)
      ln(CA, midY+115, W-M, midY+115, BLUSH, 0.3)
      greenFooter()

      // ══════════════════════════════════════════
      // MOMENTOS
      // ══════════════════════════════════════════
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase()

        doc.addPage(); bg(CREAM)
        fillR(0, 0, W, 24, DG)
        badge(dateStr, M, 15, WINE)
        heartImg(W-M,    12, 1.8, BLUSH)
        heartImg(W-M-8,  12, 1.5, ROSE)
        heartImg(W-M-15, 12, 1.2, [200,160,175])

        let y = 34
        y += T(m.title, W/2, y, 20, DG, 'center', W-M*2, 'bolditalic')
        ln(M, y, W-M, y, GOLD, 0.4); y += 8

        if (m.photo_url) {
          const pImgW = W - M*2 - 10
          const pImgH = m.description ? 100 : 130
          const res = await polaroid(m.photo_url, M, y, pImgW, pImgH, m.title, BLUSH)
          y = res.bottomY + 8
          if (m.description) {
            const lines = doc.setFontSize(10).splitTextToSize(m.description, W-M*2-12) as string[]
            const dH = lines.length * 5.5 + 12
            fillR(M, y, 3.5, dH, WINE)
            fillR(M+3.5, y, W-M*2-3.5, dH, [250,240,244])
            T(m.description, M+9, y+7, 10, GRAY, 'left', W-M*2-14, 'italic')
            y += dH + 8
          }
          fillEmpty(y, H-32)
        } else {
          const cardH = 72
          fillR(M, y, W-M*2, cardH, [246,236,241])
          strokeR(M, y, W-M*2, cardH, BLUSH, 0.4)
          fillR(M, y, 3.5, cardH, WINE)
          tape(W/2-12, y, 20, BLUSH)
          tape(W/2+12, y, 20, [218,202,212])
          T(m.description||'Um momento especial', M+10, y+16, 11, DG, 'left', W-M*2-14, 'italic')
          heartRow(W/2, y+cardH-10, 4, 1.4, ROSE)
          y += cardH + 10
          fillEmpty(y, H-32)
        }

        heartRow(W/2, H-26, 9, 1.3, BLUSH)
        greenFooter()
      }

      // ══════════════════════════════════════════
      // SEPARADOR CAPÍTULO
      // ══════════════════════════════════════════
      const chapterPage = (title: string) => {
        doc.addPage(); bg(CREAM)
        const CP = 70
        fillR(0, 0, CP, H, DG)
        leaf(CP*0.22, 22, 8, DG2, 45);  leaf(CP*0.75, 38, 5, DG2, -30)
        leaf(CP*0.18, H/2-40, 6, DG2, 80); leaf(CP*0.7, H/2-20, 4, DG2, -60)
        leaf(CP*0.18, H-32, 7, DG2, 130); leaf(CP*0.75, H-52, 4.5, DG2, -120)
        heartImg(CP/2, H/2+4, 8, WINE)
        heartImg(CP/2, H/2+24, 4, ROSE)
        heartImg(CP/2, H/2+38, 2.5, BLUSH)
        T('HAPPY',   8, H-40, 9, CREAM, 'left', undefined, 'bold')
        T('FOREVER', 8, H-29, 9, CREAM, 'left', undefined, 'bold')

        const ccx = CP + (W-CP)/2
        circ(ccx, H/2, 40, [238,218,226])
        heartImg(ccx, H/2, 10, WINE)
        heartRow(ccx, H/2+22, 5, 1.5, ROSE)
        ln(CP+M, H/2-32, W-M, H/2-32, BLUSH, 0.35)
        T('CAPITULO', ccx, H/2-22, 7.5, WINE, 'center', undefined, 'bold')
        T(title, ccx, H/2-5, 20, DG, 'center', W-CP-M*2, 'bolditalic')
        ln(CP+M, H/2+6, W-M, H/2+6, BLUSH, 0.35)
        T('uma historia de amor', ccx, H/2+18, 8, GRAY, 'center', W-CP-M*2, 'italic')
      }

      // ══════════════════════════════════════════
      // CARTA
      // ══════════════════════════════════════════
      if (letters.wedding?.text) {
        chapterPage('Nossa Carta')
        doc.addPage(); bg(CREAM)
        fillR(0, 0, 18, H, WINE)
        for (let yy = 22; yy < H-18; yy += 13) heartImg(9, yy, 1.8, ROSE)
        fillR(22, 14, W-30, 16, DG)
        heartImg(30, 22, 1.8, BLUSH)
        T('CARTA DO CASAMENTO', 38, 24, 8, WHITE, 'left', undefined, 'bold')
        ln(22, 34, W-8, 34, BLUSH, 0.3)
        tape(W/2-18, 46, 18, BLUSH)
        tape(W/2+18, 46, 18, [218,202,212])
        const cX = 22, cW2 = W-30, cY = 50, cH = H-80
        fillR(cX, cY, cW2, cH, WHITE)
        strokeR(cX, cY, cW2, cH, BLUSH, 0.3)
        for (let ly = cY+13; ly < cY+cH-5; ly += 8)
          ln(cX+4, ly, cX+cW2-4, ly, [240,228,233], 0.18)
        T(letters.wedding.text, cX+6, cY+13, 10, DG, 'left', cW2-12)
        heartRow(W/2, H-22, 7, 1.4, BLUSH)
        fillR(0, H-14, W, 14, DG)
        T('feito com amor  -  nossa historia', W/2, H-6, 6, BLUSH, 'center')
      }

      // ══════════════════════════════════════════
      // CONVIDADOS
      // ══════════════════════════════════════════
      if (guestPosts.length > 0) {
        chapterPage('Mensagens da Familia')
        doc.addPage(); bg(CREAM)
        fillR(0, 0, W, 24, DG)
        badge('MENSAGENS', M, 15, WINE)
        let gy = 34
        for (const p of guestPosts) {
          if (gy > 260) { doc.addPage(); bg(CREAM); fillR(0,0,W,24,DG); gy=34 }
          ln(M, gy, W-M, gy, BLUSH, 0.3); gy += 7
          gy += T(p.name, M, gy, 12, WINE, 'left', undefined, 'bold')
          gy += T(p.message, M, gy, 9.5, GRAY, 'left', W-M*2, 'italic') + 8
        }
        greenFooter()
      }

      // ══════════════════════════════════════════
      // PÁGINA FINAL
      // ══════════════════════════════════════════
      doc.addPage(); bg(CREAM)
      greenPanel()
      heartImg(PW/2, H/2-18, 8, WINE)
      heartImg(PW/2, H/2+6,  5, ROSE)
      heartImg(PW/2, H/2+22, 3, BLUSH)
      T('HAPPY',   8, H-40, 10, CREAM, 'left', undefined, 'bold')
      T('FOREVER', 8, H-29, 10, CREAM, 'left', undefined, 'bold')

      const fcx = PW + (W-PW)/2
      heartRow(fcx, 40, 7, 1.5, BLUSH)
      ln(PW+M, 50, W-M, 50, BLUSH, 0.3)
      circ(fcx, 100, 36, [233,212,220])
      circ(fcx, 100, 30, [244,226,232])
      heartImg(fcx, 100, 11, WINE)
      T(coupleName, fcx, 148, 18, DG, 'center', W-PW-M*2, 'bolditalic')
      ln(PW+M, 154, W-M, 154, GOLD, 0.5)
      T('HAPPY FOREVER', fcx, 165, 9, WINE, 'center', undefined, 'bold')
      heartRow(fcx, 174, 9, 1.4, ROSE)
      ln(PW+M, 182, W-M, 182, BLUSH, 0.3)
      T('NOSSA HISTORIA  ' + new Date().getFullYear(), fcx, 192, 7.5, GRAY, 'center')
      T('LOVE', fcx-24, 208, 11, BLUSH, 'center', undefined, 'bold')
      T('AMOR', fcx,    208, 11, [228,205,215], 'center', undefined, 'bold')
      T('LOVE', fcx+24, 208, 11, BLUSH, 'center', undefined, 'bold')
      heartRow(fcx, 218, 5, 1.6, [230,205,218])
      T('para sempre juntos', fcx, 230, 9, GRAY, 'center', undefined, 'italic')
      heartRow(fcx, 240, 3, 1.2, BLUSH)
      greenFooter()

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
            Album estilo folheto elegante com fotos em polaroid e toda a historia de voces.
          </p>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'fotos em moldura polaroid' },
            { icon: '💌', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita ✓' : 'nao escrita ainda' },
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
        <button onClick={generatePDF} disabled={generating||done}
          className="btn-primary disabled:opacity-60 py-4 text-base w-full">
          {done ? 'PDF baixado!' : generating ? 'Gerando PDF...' : 'Gerar e baixar PDF'}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: '#C9A0B0' }}>
          O PDF e gerado no seu celular
        </p>
      </div>
    </Layout>
  )
}
