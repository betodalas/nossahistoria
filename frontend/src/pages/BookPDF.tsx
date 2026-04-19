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

      // Paleta inspirada no folheto de referência
      const DG    = [42,  58,  38]  as [number,number,number]  // verde escuro painel
      const DG2   = [55,  75,  48]  as [number,number,number]  // verde folha
      const WINE  = [110, 50,  70]  as [number,number,number]  // vinho
      const ROSE  = [180, 100, 130] as [number,number,number]  // rosa médio
      const BLUSH = [240, 218, 225] as [number,number,number]  // rosa claro
      const CREAM = [255, 248, 244] as [number,number,number]  // creme fundo
      const WHITE = [255, 255, 255] as [number,number,number]
      const GOLD  = [185, 148, 88]  as [number,number,number]  // dourado
      const GRAY  = [120, 95,  108] as [number,number,number]  // cinza rosado

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Primitivas
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

      // Tipografia
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

      // Coração
      const heart = (cx: number, cy: number, s: number, c: [number,number,number]) => {
        doc.setFillColor(...c)
        doc.circle(cx - s*0.28, cy - s*0.1, s*0.32, 'F')
        doc.circle(cx + s*0.28, cy - s*0.1, s*0.32, 'F')
        for (let i = 0; i <= 10; i++) {
          const t2 = (i/10)*Math.PI
          doc.circle(cx + Math.sin(t2)*s*0.52, cy + s*0.12 + (1-Math.cos(t2))*s*0.3, s*0.2, 'F')
        }
      }

      // Folha
      const leaf = (x: number, y: number, s: number, c: [number,number,number], angle = 0) => {
        doc.setFillColor(...c)
        const rad = angle * Math.PI / 180
        doc.circle(x, y, s * 0.65, 'F')
        doc.circle(x + Math.cos(rad)*s*0.5, y - Math.sin(rad)*s*0.5, s * 0.5, 'F')
      }

      // Fileira de corações
      const heartRow = (cx: number, y: number, n: number, s: number, c: [number,number,number]) => {
        for (let i = 0; i < n; i++) heart(cx + (i-(n-1)/2)*(s*2.8), y, s, c)
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
        const lc: [number,number,number] = [Math.min(255,c[0]+25), Math.min(255,c[1]+25), Math.min(255,c[2]+25)]
        fillR(cx-w/2, y-3.5, w, 6, lc)
        strokeR(cx-w/2, y-3.5, w, 6, [Math.max(0,c[0]-20), Math.max(0,c[1]-20), Math.max(0,c[2]-20)], 0.15)
      }

      // POLAROID — borda branca grossa embaixo, fita no topo, inclinação
      const polaroid = async (
        url: string | null,
        cx: number, cy: number,
        imgW: number, imgH: number,
        caption: string,
        angleDeg = 0,
        tapeColor: [number,number,number] = BLUSH
      ) => {
        const PS = 6, PT = 6, PB = 20  // padding sides, top, bottom
        const fw = imgW + PS*2
        const fh = imgH + PT + PB
        const rad = angleDeg * Math.PI / 180
        const ox = Math.sin(rad) * fh * 0.3
        const oy = Math.abs(Math.sin(rad)) * fw * 0.07
        const fx = cx - fw/2 + ox
        const fy = cy - fh/2 + oy

        // Sombra
        fillR(fx+3, fy+3, fw, fh, [185, 168, 178])
        // Corpo branco
        fillR(fx, fy, fw, fh, WHITE)
        strokeR(fx, fy, fw, fh, [205, 188, 198], 0.18)
        // Cantos decorativos
        fillR(fx-1, fy-1, 3, 3, ROSE)
        fillR(fx+fw-2, fy-1, 3, 3, ROSE)
        fillR(fx-1, fy+fh-2, 3, 3, ROSE)
        fillR(fx+fw-2, fy+fh-2, 3, 3, ROSE)
        // Fita no topo
        tape(fx+fw/2, fy, 22, tapeColor)

        // Foto
        let imgData: string | null = null
        let realH = imgH
        if (url) {
          try { imgData = await loadImage(url).catch(() => null) } catch {}
          if (imgData) {
            const tmp = new Image()
            await new Promise(r => { tmp.onload=r; tmp.onerror=r; tmp.src=imgData! })
            const iw = tmp.naturalWidth||4, ih = tmp.naturalHeight||3
            realH = Math.min(imgW*(ih/iw), imgH)
          }
        }
        const px = fx+PS, py = fy+PT
        if (imgData) {
          fillR(px, py, imgW, imgH, [230, 218, 225])
          doc.addImage(imgData,'JPEG', px, py+(imgH-realH)/2, imgW, realH, undefined, 'MEDIUM')
        } else {
          fillR(px, py, imgW, imgH, BLUSH)
          heart(px+imgW/2, py+imgH/2, 7, [215, 190, 202])
        }
        // Legenda na parte inferior branca da polaroid
        T(caption.toLowerCase(), fx+fw/2, fy+PT+imgH+13, 7, GRAY, 'center', fw-4, 'italic')

        return { bottomY: fy+fh, rightX: fx+fw }
      }

      // Painel verde lateral (identidade do folheto)
      const greenPanel = (panelW = 72) => {
        fillR(0, 0, panelW, H, DG)
        leaf(panelW*0.22, 20, 7, DG2, 45)
        leaf(panelW*0.75, 35, 5, DG2, -30)
        leaf(panelW*0.18, H-28, 6, DG2, 135)
        leaf(panelW*0.7,  H-42, 4, DG2, -120)
        leaf(panelW*0.5,  85,   3, DG2, 60)
        leaf(panelW*0.3, H/2+25, 3.5, DG2, -60)
      }

      // Rodapé verde
      const greenFooter = (h = 16) => {
        fillR(0, H-h, W, h, DG)
        leaf(W-14, H-h/2, 3, DG2, -30)
        leaf(W-23, H-h/2, 2.5, DG2, 20)
        T('feito com amor  •  nossa história', W/2, H-h/2+2.5, 6, BLUSH, 'center')
      }

      // ═════════════════════════════════════════════════
      // CAPA
      // ═════════════════════════════════════════════════
      bg(CREAM)
      const PW = 72
      greenPanel(PW)

      T('NOSSA',   12, 52, 14, BLUSH, 'left', undefined, 'bold')
      T('História',10, 74, 27, WHITE, 'left', undefined, 'bolditalic')
      T('de amor', 12, 92, 9,  BLUSH, 'left', undefined, 'italic')
      ln(10, 100, PW-10, 100, BLUSH, 0.4)

      heart(35, H/2-12, 10, WINE)
      heart(35, H/2+14, 6, ROSE)
      heart(35, H/2+32, 3.5, BLUSH)

      T('HAPPY',   10, H-40, 9, CREAM, 'left', undefined, 'bold')
      T('FOREVER', 10, H-29, 9, CREAM, 'left', undefined, 'bold')

      // Dois polaroids de placeholder na capa
      const f1 = await polaroid(null, PW+38, 80, 50, 42, 'nosso momento', -4, BLUSH)
      const f2 = await polaroid(null, PW+88, 106, 43, 36, 'para sempre',   3, [218, 200, 212])
      const midY = Math.max(f1.bottomY, f2.bottomY) + 10

      ln(PW+8, midY, W-10, midY, GOLD, 0.5)

      T('WE ACCOMPANY YOU', PW+65, midY+9, 7.5, WINE, 'center', W-PW-20, 'bold')
      heartRow(PW+65, midY+17, 5, 1.4, ROSE)

      const coupleName = couple?.couple_name || 'Roberto e Rosana'
      T(coupleName, PW+65, midY+30, 17, DG, 'center', W-PW-18, 'bolditalic')
      ln(PW+20, midY+36, W-12, midY+36, GOLD, 0.4)

      fillR(PW+30, midY+40, 70, 10, WINE)
      T('4 DE ABRIL DE 2025', PW+65, midY+47, 7, WHITE, 'center')

      circ(PW+65, midY+82, 28, [233, 212, 220])
      circ(PW+65, midY+82, 23, [244, 226, 232])
      heart(PW+65, midY+82, 10, WINE)

      ln(PW+20, midY+117, W-12, midY+117, BLUSH, 0.3)
      heartRow(PW+65, midY+125, 7, 1.3, ROSE)

      greenFooter()

      // ═════════════════════════════════════════════════
      // MOMENTOS
      // ═════════════════════════════════════════════════
      for (const m of moments) {
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase()

        doc.addPage(); bg(CREAM)

        // Faixa topo verde
        fillR(0, 0, W, 24, DG)
        leaf(W-14, 12, 3.5, DG2, -30)
        leaf(W-24, 12, 3,   DG2, 20)
        badge(dateStr, 10, 15, WINE)
        heartRow(W-36, 12, 3, 1.2, BLUSH)

        let y = 34

        // Título
        y += T(m.title, W/2, y, 20, DG, 'center', W-30, 'bolditalic')
        ln(18, y, W-18, y, GOLD, 0.4); y += 8

        if (m.photo_url) {
          const maxFW = W - 44
          const maxFH = m.description ? 108 : 140
          const res = await polaroid(m.photo_url, W/2, y + maxFH/2 + 10, maxFW, maxFH, m.title, -1.5, BLUSH)
          y = res.bottomY + 10

          if (m.description) {
            const descLines = doc.setFontSize(10).splitTextToSize(m.description, W-44)
            const descH = descLines.length * 5.5 + 10
            fillR(14, y, 3.5, descH, WINE)
            fillR(17.5, y, W-32, descH, [250, 240, 244])
            T(m.description, 23, y+7, 10, GRAY, 'left', W-42, 'italic')
          }
        } else {
          fillR(14, y+2, W-28, 72, [246, 236, 241])
          strokeR(14, y+2, W-28, 72, BLUSH, 0.4)
          fillR(14, y+2, 3.5, 72, WINE)
          tape(W/2-18, y+2, 18, BLUSH)
          tape(W/2+18, y+2, 18, [218, 202, 212])
          T(m.description||'Um momento especial', 24, y+18, 11, DG, 'left', W-42, 'italic')
        }

        heartRow(W/2, H-22, 9, 1.3, BLUSH)
        greenFooter()
      }

      // ═════════════════════════════════════════════════
      // SEPARADOR CAPÍTULO
      // ═════════════════════════════════════════════════
      const chapterPage = (title: string) => {
        doc.addPage(); bg(CREAM)
        fillR(0, 0, 70, H, DG)
        leaf(15, 22, 8, DG2, 45);  leaf(56, 38, 5, DG2, -30)
        leaf(10, H/2-40, 6, DG2, 80); leaf(60, H/2-20, 4, DG2, -60)
        leaf(12, H-32, 7, DG2, 130); leaf(58, H-52, 4.5, DG2, -120)
        heart(35, H/2+8, 9, WINE); heart(20, H/2+34, 4, ROSE); heart(50, H/2+28, 3, BLUSH)
        T('HAPPY',   10, H-40, 9, CREAM, 'left', undefined, 'bold')
        T('FOREVER', 10, H-29, 9, CREAM, 'left', undefined, 'bold')

        circ(W/2+15, H/2, 40, [238, 218, 226])
        heart(W/2+15, H/2-8, 12, WINE)
        heartRow(W/2+15, H/2+18, 5, 1.5, ROSE)
        ln(78, H/2-32, W-12, H/2-32, BLUSH, 0.35)
        T('CAPÍTULO', W/2+15, H/2-22, 7.5, WINE, 'center', undefined, 'bold')
        T(title, W/2+15, H/2-5, 20, DG, 'center', W-100, 'bolditalic')
        ln(78, H/2+6, W-12, H/2+6, BLUSH, 0.35)
        T('uma história de amor', W/2+15, H/2+18, 8, GRAY, 'center', W-100, 'italic')
      }

      // ═════════════════════════════════════════════════
      // CARTA
      // ═════════════════════════════════════════════════
      if (letters.wedding?.text) {
        chapterPage('Nossa Carta')
        doc.addPage(); bg(CREAM)

        // Barra lateral vinho
        fillR(0, 0, 20, H, WINE)
        for (let yy = 22; yy < H-20; yy += 14) heart(10, yy, 2.2, ROSE)

        fillR(24, 14, W-32, 16, DG)
        circ(32, 22, 4, BLUSH)
        T('CARTA DO CASAMENTO', 40, 24, 8, WHITE, 'left', undefined, 'bold')
        ln(24, 34, W-8, 34, BLUSH, 0.3)

        tape(W/2-20, 46, 18, BLUSH)
        tape(W/2+20, 46, 18, [218, 202, 212])

        const cX = 24, cW = W-32, cY = 50, cH = H-82
        fillR(cX, cY, cW, cH, WHITE)
        strokeR(cX, cY, cW, cH, BLUSH, 0.3)
        for (let ly = cY+14; ly < cY+cH-6; ly += 8) {
          ln(cX+4, ly, cX+cW-4, ly, [240, 228, 233], 0.18)
        }
        T(letters.wedding.text, cX+6, cY+14, 10, DG, 'left', cW-12)

        heartRow(W/2, H-22, 7, 1.4, BLUSH)
        fillR(0, H-14, W, 14, DG)
        T('feito com amor  •  nossa história', W/2, H-6, 6, BLUSH, 'center')
      }

      // ═════════════════════════════════════════════════
      // CONVIDADOS
      // ═════════════════════════════════════════════════
      if (guestPosts.length > 0) {
        chapterPage('Mensagens da Família')
        doc.addPage(); bg(CREAM)
        fillR(0, 0, W, 24, DG)
        badge('MENSAGENS', 10, 15, WINE)
        let gy = 34
        for (const p of guestPosts) {
          if (gy > 260) { doc.addPage(); bg(CREAM); fillR(0,0,W,24,DG); gy=34 }
          ln(14, gy, W-14, gy, BLUSH, 0.3); gy += 7
          gy += T(p.name, 14, gy, 12, WINE, 'left', undefined, 'bold')
          gy += T(p.message, 14, gy, 9.5, GRAY, 'left', W-28, 'italic') + 8
        }
        greenFooter()
      }

      // ═════════════════════════════════════════════════
      // PÁGINA FINAL
      // ═════════════════════════════════════════════════
      doc.addPage(); bg(CREAM)
      greenPanel(72)

      heart(36, H/2-25, 10, WINE); heart(36, H/2+2, 6, ROSE)
      heart(22, H/2+22, 3.5, BLUSH); heart(50, H/2+18, 3, BLUSH)
      T('HAPPY',   10, H-40, 10, CREAM, 'left', undefined, 'bold')
      T('FOREVER', 10, H-28, 10, CREAM, 'left', undefined, 'bold')

      heartRow(W/2+5, 40, 7, 1.5, BLUSH)
      ln(80, 50, W-12, 50, BLUSH, 0.3)

      circ(W/2+5, 100, 38, [233, 212, 220])
      circ(W/2+5, 100, 33, [244, 226, 232])
      heart(W/2+5, 100, 12, WINE)

      T(coupleName, W/2+5, 148, 20, DG, 'center', W-100, 'bolditalic')
      ln(82, 154, W-14, 154, GOLD, 0.5)
      T('HAPPY FOREVER', W/2+5, 165, 9, WINE, 'center', undefined, 'bold')
      heartRow(W/2+5, 174, 9, 1.5, ROSE)
      ln(82, 182, W-14, 182, BLUSH, 0.3)
      T('NOSSA HISTÓRIA  ' + new Date().getFullYear(), W/2+5, 192, 7.5, GRAY, 'center')

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
            Álbum estilo folheto elegante — fotos em moldura polaroid, tipografia bonita e toda a história de vocês.
          </p>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9B6B7A' }}>O que vai no livro</p>
          {[
            { icon: '💍', label: 'Capa personalizada', sub: couple?.couple_name || 'com nome do casal' },
            { icon: '📸', label: `${moments.length} momentos`, sub: 'fotos em moldura polaroid' },
            { icon: '💌', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita ✓' : 'não escrita ainda' },
            { icon: '👨‍👩‍👧', label: `${guestPosts.length} mensagens`, sub: 'do álbum de convidados' },
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
          O PDF é gerado no seu celular — nenhum dado sai do seu dispositivo
        </p>
      </div>
    </Layout>
  )
}
