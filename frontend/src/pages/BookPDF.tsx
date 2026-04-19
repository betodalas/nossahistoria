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

      // Coração Unicode ♥ — renderiza limpo em qualquer tamanho
      const hrt = (x: number, y: number, size: number, c: [number,number,number], align: 'left'|'center'|'right' = 'left') => {
        doc.setFontSize(size); doc.setTextColor(...c); doc.setFont('helvetica', 'normal')
        doc.text('\u2665', x, y, { align })
      }

      // Fileira de corações Unicode
      const heartRow = (cx: number, y: number, n: number, size: number, c: [number,number,number]) => {
        const spacing = size * 0.52
        const totalW = (n - 1) * spacing
        for (let i = 0; i < n; i++) {
          hrt(cx - totalW/2 + i * spacing, y, size, c)
        }
      }

      // Folha decorativa (estas ficam só no painel verde, não viram corações)
      const leaf = (x: number, y: number, s: number, c: [number,number,number], angle = 0) => {
        doc.setFillColor(...c)
        const rad = angle * Math.PI / 180
        doc.circle(x, y, s*0.65, 'F')
        doc.circle(x + Math.cos(rad)*s*0.5, y - Math.sin(rad)*s*0.5, s*0.5, 'F')
      }

      // Badge de data
      const badge = (label: string, x: number, y: number, c: [number,number,number] = WINE) => {
        const tw = label.length * 1.45 + 8
        fillR(x, y-4.5, tw, 8, c)
        T(label, x+4, y+0.8, 5.5, WHITE)
        return tw
      }

      // Fita adesiva
      const tape = (cx: number, y: number, w = 18, c: [number,number,number] = BLUSH) => {
        const lc: [number,number,number] = [Math.min(255,c[0]+30), Math.min(255,c[1]+30), Math.min(255,c[2]+30)]
        fillR(cx-w/2, y-3, w, 5.5, lc)
        strokeR(cx-w/2, y-3, w, 5.5, [Math.max(0,c[0]-25), Math.max(0,c[1]-25), Math.max(0,c[2]-25)], 0.15)
      }

      // POLAROID — fx/fy = canto superior esquerdo
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

        // Sombra
        fillR(fx+3, fy+3, fw, fh, [170, 148, 160])
        // Corpo branco
        fillR(fx, fy, fw, fh, WHITE)
        strokeR(fx, fy, fw, fh, [190, 168, 180], 0.25)
        // Cantos rosa
        fillR(fx-1.5, fy-1.5, 4, 4, ROSE)
        fillR(fx+fw-2.5, fy-1.5, 4, 4, ROSE)
        fillR(fx-1.5, fy+fh-2.5, 4, 4, ROSE)
        fillR(fx+fw-2.5, fy+fh-2.5, 4, 4, ROSE)
        // Fita adesiva
        tape(fx+fw/2, fy, 22, tapeColor)

        const px = fx + PS, py = fy + PT

        // Cover crop
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
          hrt(px+imgW/2, py+imgH/2+4, 20, [210, 185, 200], 'center')
        }

        // Legenda na faixa branca inferior
        T(caption.toLowerCase(), fx+fw/2, fy+PT+imgH+12, 7, GRAY, 'center', fw-4, 'italic')

        return { bottomY: fy+fh, fw, fh }
      }

      // Painel verde lateral
      const PW = 70
      const greenPanel = () => {
        fillR(0, 0, PW, H, DG)
        leaf(PW*0.22, 20, 7, DG2, 45)
        leaf(PW*0.75, 36, 5, DG2, -30)
        leaf(PW*0.18, H-30, 6, DG2, 135)
        leaf(PW*0.7, H-44, 4, DG2, -120)
        leaf(PW*0.5, 88, 3, DG2, 60)
        leaf(PW*0.3, H/2+28, 3.5, DG2, -60)
      }

      // Rodapé verde
      const greenFooter = () => {
        fillR(0, H-16, W, 16, DG)
        hrt(W-10, H-6, 7, DG2)
        hrt(W-18, H-6, 6, DG2)
        T('feito com amor  \u2665  nossa historia', W/2, H-5.5, 6, BLUSH, 'center')
      }

      // Decoração de espaço vazio: frases e corações espalhados
      const fillEmpty = (startY: number, endY: number, cx: number, availW: number) => {
        const phrases = ['LOVE', 'SEMPRE', 'AMOR', '\u2665\u2665\u2665', 'PARA SEMPRE', 'JUNTOS']
        const midY = (startY + endY) / 2
        const gap = (endY - startY) / 5

        // Linha decorativa topo
        ln(cx - availW*0.3, startY+6, cx + availW*0.3, startY+6, BLUSH, 0.3)

        // Frases alternadas espalhadas
        T(phrases[0], cx - availW*0.25, startY + gap,     10, BLUSH, 'center', undefined, 'bold')
        hrt(cx + availW*0.2, startY + gap - 1, 9, BLUSH)

        heartRow(cx, startY + gap*1.8, 5, 9, [235, 205, 215])

        T(phrases[4], cx, midY, 12, [230, 208, 218], 'center', undefined, 'bolditalic')

        heartRow(cx, midY + 12, 7, 8, BLUSH)

        T(phrases[2], cx - availW*0.2, midY + 26, 10, BLUSH, 'center', undefined, 'bold')
        hrt(cx + availW*0.22, midY + 25, 9, [220, 190, 210])

        heartRow(cx, midY + 40, 5, 7, [235, 205, 215])

        ln(cx - availW*0.3, endY-6, cx + availW*0.3, endY-6, BLUSH, 0.3)
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

      hrt(PW/2, H/2-16, 22, WINE, 'center')
      hrt(PW/2, H/2+12, 14, ROSE, 'center')
      hrt(PW/2, H/2+30, 9,  BLUSH,'center')

      T('HAPPY',   8, H-40, 9, CREAM, 'left', undefined, 'bold')
      T('FOREVER', 8, H-29, 9, CREAM, 'left', undefined, 'bold')

      // Área creme da capa
      const CA  = PW + M          // x inicial da área creme
      const CW  = W - PW - M*2    // largura disponível sem margens (= 210-70-28 = 112)
      const cx  = CA + CW/2       // centro

      // Dois polaroids pequenos que CABEM dentro de CW
      // fw = imgW + 10;  dois lado a lado + gap: 2*fw + gap = CW → fw = (CW-4)/2 ≈ 54
      const pSmall = Math.floor((CW - 6) / 2)  // imgW de cada polaroid
      const pH1 = 44, pH2 = 38

      const f1 = await polaroid(null, CA,           22, pSmall, pH1, 'nosso momento', BLUSH)
      const f2 = await polaroid(null, CA+pSmall+16, 34, pSmall, pH2, 'para sempre',   [218,200,212])

      const midY = Math.max(f1.bottomY, f2.bottomY) + 10

      ln(CA, midY, W-M, midY, GOLD, 0.5)
      T('WE ACCOMPANY YOU', cx, midY+9, 7.5, WINE, 'center', CW, 'bold')
      heartRow(cx, midY+18, 5, 8, ROSE)

      const coupleName = couple?.couple_name || 'Roberto e Rosana'
      T(coupleName, cx, midY+30, 15, DG, 'center', CW, 'bolditalic')
      ln(CA, midY+36, W-M, midY+36, GOLD, 0.4)

      fillR(CA+8, midY+40, CW-16, 10, WINE)
      T('4 DE ABRIL DE 2025', cx, midY+47, 7, WHITE, 'center')

      circ(cx, midY+80, 26, [233,212,220])
      circ(cx, midY+80, 21, [244,226,232])
      hrt(cx, midY+85, 22, WINE, 'center')

      heartRow(cx, midY+115, 7, 8, ROSE)
      ln(CA, midY+118, W-M, midY+118, BLUSH, 0.3)

      greenFooter()

      // ══════════════════════════════════════════
      // MOMENTOS
      // ══════════════════════════════════════════
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase()

        doc.addPage(); bg(CREAM)

        // Faixa topo verde
        fillR(0, 0, W, 24, DG)
        badge(dateStr, M, 15, WINE)
        // Corações Unicode no canto direito
        hrt(W-M,    12, 9, BLUSH)
        hrt(W-M-9,  12, 8, ROSE)
        hrt(W-M-17, 12, 7, [200, 160, 175])

        let y = 34

        y += T(m.title, W/2, y, 20, DG, 'center', W-M*2, 'bolditalic')
        ln(M, y, W-M, y, GOLD, 0.4); y += 8

        if (m.photo_url) {
          // Polaroid ocupa toda a largura útil (sem inclinação para não cortar)
          const pImgW = W - M*2 - 10  // imgW; fw = pImgW+10 = W-M*2 = 182 ✓
          const pImgH = m.description ? 100 : 130
          const res = await polaroid(m.photo_url, M, y, pImgW, pImgH, m.title, BLUSH)
          y = res.bottomY + 8

          if (m.description) {
            const lines = doc.setFontSize(10).splitTextToSize(m.description, W-M*2-12) as string[]
            const dH = lines.length * 5.5 + 12
            fillR(M, y, 3.5, dH, WINE)
            fillR(M+3.5, y, W-M*2-3.5, dH, [250, 240, 244])
            T(m.description, M+9, y+7, 10, GRAY, 'left', W-M*2-14, 'italic')
            y += dH + 8
          }

          // Preenche espaço vazio restante acima do rodapé
          const emptyStart = y
          const emptyEnd   = H - 32
          if (emptyEnd - emptyStart > 28) {
            fillEmpty(emptyStart, emptyEnd, W/2, W-M*2)
          }
        } else {
          // Sem foto: card com texto e decoração
          const cardH = 72
          fillR(M, y, W-M*2, cardH, [246, 236, 241])
          strokeR(M, y, W-M*2, cardH, BLUSH, 0.4)
          fillR(M, y, 3.5, cardH, WINE)
          tape(W/2-12, y, 20, BLUSH)
          tape(W/2+12, y, 20, [218, 202, 212])
          T(m.description||'Um momento especial', M+10, y+16, 11, DG, 'left', W-M*2-14, 'italic')
          heartRow(W/2, y+cardH-10, 4, 8, ROSE)
          y += cardH + 10

          // Preenche o resto da página
          fillEmpty(y, H-32, W/2, W-M*2)
        }

        heartRow(W/2, H-26, 9, 8, BLUSH)
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
        hrt(CP/2, H/2+8,  22, WINE,  'center')
        hrt(CP/2, H/2+28, 14, ROSE,  'center')
        hrt(CP/2, H/2+42, 9,  BLUSH, 'center')
        T('HAPPY',   8, H-40, 9, CREAM, 'left', undefined, 'bold')
        T('FOREVER', 8, H-29, 9, CREAM, 'left', undefined, 'bold')

        const ccx = CP + (W-CP)/2
        circ(ccx, H/2, 40, [238,218,226])
        hrt(ccx, H/2+4, 26, WINE, 'center')
        heartRow(ccx, H/2+22, 5, 8, ROSE)
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
        // Corações Unicode na barra vinho
        for (let yy = 20; yy < H-18; yy += 13) {
          hrt(9, yy, 7, ROSE, 'center')
        }

        fillR(22, 14, W-30, 16, DG)
        hrt(30, 24, 9, BLUSH)
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

        heartRow(W/2, H-22, 7, 8, BLUSH)
        fillR(0, H-14, W, 14, DG)
        T('feito com amor  \u2665  nossa historia', W/2, H-6, 6, BLUSH, 'center')
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

      hrt(PW/2, H/2-18, 22, WINE,  'center')
      hrt(PW/2, H/2+8,  14, ROSE,  'center')
      hrt(PW/2, H/2+26, 9,  BLUSH, 'center')
      T('HAPPY',   8, H-40, 10, CREAM, 'left', undefined, 'bold')
      T('FOREVER', 8, H-29, 10, CREAM, 'left', undefined, 'bold')

      const fcx = PW + (W-PW)/2
      heartRow(fcx, 40, 7, 8, BLUSH)
      ln(PW+M, 50, W-M, 50, BLUSH, 0.3)

      circ(fcx, 100, 36, [233,212,220])
      circ(fcx, 100, 30, [244,226,232])
      hrt(fcx, 105, 26, WINE, 'center')

      T(coupleName, fcx, 148, 18, DG, 'center', W-PW-M*2, 'bolditalic')
      ln(PW+M, 154, W-M, 154, GOLD, 0.5)
      T('HAPPY FOREVER', fcx, 165, 9, WINE, 'center', undefined, 'bold')
      heartRow(fcx, 174, 9, 8, ROSE)
      ln(PW+M, 182, W-M, 182, BLUSH, 0.3)
      T('NOSSA HISTORIA  ' + new Date().getFullYear(), fcx, 192, 7.5, GRAY, 'center')

      // Decoração: frases LOVE abaixo
      T('LOVE', fcx - 24, 208, 11, BLUSH, 'center', undefined, 'bold')
      T('AMOR', fcx,      208, 11, [228,205,215], 'center', undefined, 'bold')
      T('LOVE', fcx + 24, 208, 11, BLUSH, 'center', undefined, 'bold')
      heartRow(fcx, 220, 5, 9, [230,205,218])
      T('para sempre juntos', fcx, 232, 9, GRAY, 'center', undefined, 'italic')
      heartRow(fcx, 242, 3, 7, BLUSH)

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
            Album estilo folheto elegante — fotos em polaroid, tipografia bonita e toda a historia de voces.
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
          {done ? '✓ PDF baixado!' : generating ? 'Gerando PDF...' : 'Gerar e baixar PDF'}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: '#C9A0B0' }}>
          O PDF e gerado no seu celular — nenhum dado sai do seu dispositivo
        </p>
      </div>
    </Layout>
  )
}
