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

  const generateQuote = async (title: string, description: string): Promise<string> => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Crie uma frase romântica e poética em português para um álbum de casamento.
O momento se chama "${title}"${description ? ` e tem a descrição: "${description}"` : ''}.
A frase deve ter entre 10 e 20 palavras, ser intimista e emocionante, sem clichês óbvios.
Responda APENAS com a frase, sem aspas, sem explicações, sem pontuação no final.`
          }]
        })
      })
      const data = await response.json()
      return data.content?.[0]?.text?.trim() || 'cada momento guardado é uma eternidade de amor'
    } catch {
      return 'cada momento guardado é uma eternidade de amor'
    }
  }

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const W = 210, H = 297
      const M = 16   // margem lateral
      const MID = W / 2

      // Paleta clássica de álbum de casamento
      const DARK   = [40,  28,  18]  as [number,number,number]  // marrom escuro
      const GOLD   = [185, 148, 80]  as [number,number,number]  // dourado
      const CREAM  = [250, 246, 240] as [number,number,number]  // creme fundo
      const BEIGE  = [232, 218, 198] as [number,number,number]  // bege moldura
      const SEPIA  = [120, 88,  55]  as [number,number,number]  // sépia texto
      const LGRAY  = [200, 188, 175] as [number,number,number]  // cinza claro
      const WHITE  = [255, 255, 255] as [number,number,number]

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // ── Primitivas ────────────────────────────────────────────
      const bg = (c: [number,number,number]) => {
        doc.setFillColor(...c); doc.rect(0, 0, W, H, 'F')
      }
      const fillR = (x: number, y: number, w: number, h: number, c: [number,number,number]) => {
        doc.setFillColor(...c); doc.rect(x, y, w, h, 'F')
      }
      const ln = (x1: number, y1: number, x2: number, y2: number, c: [number,number,number], lw = 0.4) => {
        doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2)
      }
      const circ = (x: number, y: number, r: number, c: [number,number,number], fill = true) => {
        doc.setFillColor(...c)
        if (fill) doc.circle(x, y, r, 'F')
        else { doc.setDrawColor(...c); doc.circle(x, y, r) }
      }

      // ── Tipografia (tudo em Times/Georgia = serif elegante) ───
      const T = (
        t: string, x: number, y: number, size: number,
        c: [number,number,number],
        align: 'left'|'center'|'right' = 'left',
        maxW?: number,
        style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal'
      ): number => {
        doc.setFontSize(size)
        doc.setTextColor(...c)
        doc.setFont('times', style)
        if (maxW) {
          const lines = doc.splitTextToSize(t, maxW)
          doc.text(lines, x, y, { align })
          return lines.length * (size * 0.43) + 2
        }
        doc.text(t, x, y, { align })
        return size * 0.43 + 2
      }

      // ── Ornamento dourado (linha + losango central) ───────────
      const ornament = (cx: number, y: number, lineW = 60) => {
        const half = lineW / 2
        ln(cx - half, y, cx - 5, y, GOLD, 0.5)
        ln(cx + 5, y, cx + half, y, GOLD, 0.5)
        // losango central
        doc.setFillColor(...GOLD)
        doc.triangle(cx, y-2.2, cx-2.2, y, cx, y+2.2, 'F')
        doc.triangle(cx, y-2.2, cx+2.2, y, cx, y+2.2, 'F')
      }

      // ── Moldura decorativa sem foto (iniciais + ornamentos) ───
      const noPhotoFrame = (cx: number, cy: number, fw: number, fh: number, initials: string) => {
        const x = cx - fw/2, y = cy - fh/2
        // Sombra suave
        fillR(x+3, y+3, fw, fh, [200, 185, 165])
        // Fundo bege elegante
        fillR(x, y, fw, fh, BEIGE)
        // Borda dourada externa
        doc.setDrawColor(...GOLD); doc.setLineWidth(0.6)
        doc.rect(x, y, fw, fh)
        // Borda interna fina
        doc.setLineWidth(0.25)
        doc.rect(x+4, y+4, fw-8, fh-8)
        // Ornamentos laterais centrais
        ornament(cx, y+4, fw*0.5)
        ornament(cx, y+fh-4, fw*0.5)
        // Losangos nos cantos
        const corners = [[x+4,y+4],[x+fw-4,y+4],[x+4,y+fh-4],[x+fw-4,y+fh-4]] as [number,number][]
        corners.forEach(([cx2,cy2]) => {
          doc.setFillColor(...GOLD)
          doc.triangle(cx2,cy2-2,cx2-2,cy2,cx2,cy2+2,'F')
          doc.triangle(cx2,cy2-2,cx2+2,cy2,cx2,cy2+2,'F')
        })
        // Iniciais grandes translúcidas
        doc.setFontSize(52); doc.setTextColor(...GOLD)
        doc.setFont('times','italic')
        doc.setGState(new (doc as any).GState({opacity:0.3}))
        doc.text(initials, cx, cy+8, {align:'center'})
        doc.setGState(new (doc as any).GState({opacity:1}))
        // Linhas decorativas
        ln(cx-20, cy-10, cx+20, cy-10, GOLD, 0.3)
        ln(cx-20, cy+14, cx+20, cy+14, GOLD, 0.3)
      }

      // ── Borda elegante da página ──────────────────────────────
      const pageBorder = () => {
        doc.setDrawColor(...GOLD)
        doc.setLineWidth(0.7)
        doc.rect(10, 10, W-20, H-20)
        doc.setLineWidth(0.25)
        doc.rect(13, 13, W-26, H-26)
      }

      // ── Carregar foto com cover-crop ──────────────────────────
      const loadCropped = async (url: string, imgW: number, imgH: number): Promise<string|null> => {
        try {
          const raw = await loadImage(url).catch(() => null)
          if (!raw) return null
          const tmp = new Image()
          await new Promise(r => { tmp.onload=r; tmp.onerror=r; tmp.src=raw })
          const iw = tmp.naturalWidth||4, ih = tmp.naturalHeight||3
          const scale = Math.max(imgW/iw, imgH/ih)
          const dw = iw*scale, dh = ih*scale
          const RES = 3
          const cc = document.createElement('canvas')
          cc.width = Math.round(imgW*RES); cc.height = Math.round(imgH*RES)
          cc.getContext('2d')!.drawImage(tmp, 0, 0, iw, ih,
            -(dw-imgW)/2*RES, -(dh-imgH)/2*RES, dw*RES, dh*RES)
          return cc.toDataURL('image/jpeg', 0.92)
        } catch { return null }
      }

      // ── Foto com moldura passepartout (sem inclinação — capa) ─
      const photoFrame = async (
        url: string|null, fx: number, fy: number, fw: number, fh: number
      ) => {
        const PAD = 4  // passepartout interno
        // sombra
        fillR(fx+3, fy+3, fw, fh, [180, 162, 140])
        // moldura escura
        fillR(fx, fy, fw, fh, DARK)
        // passepartout creme
        fillR(fx+PAD, fy+PAD, fw-PAD*2, fh-PAD*2, CREAM)
        // área da foto
        const px = fx+PAD+2, py = fy+PAD+2
        const pw = fw-PAD*2-4, ph = fh-PAD*2-4
        if (url) {
          const data = await loadCropped(url, pw, ph)
          if (data) {
            doc.addImage(data, 'JPEG', px, py, pw, ph, undefined, 'MEDIUM')
          } else {
            fillR(px, py, pw, ph, BEIGE)
          }
        } else {
          fillR(px, py, pw, ph, BEIGE)
        }
        // borda interna dourada fina
        doc.setDrawColor(...GOLD); doc.setLineWidth(0.3)
        doc.rect(px, py, pw, ph)
      }

      // ── Polaroid inclinada (páginas internas) ─────────────────
      // jsPDF não tem transform nativo — simulamos inclinação
      // desenhando a foto em canvas rotacionado e inserindo como imagem
      const polaroidTilted = async (
        url: string|null,
        cx: number, cy: number,   // centro da polaroid
        imgW: number, imgH: number,
        caption: string,
        angleDeg: number          // positivo = direita, negativo = esquerda
      ) => {
        const PAD_S = 6, PAD_T = 6, PAD_B = 22
        const fw = imgW + PAD_S*2
        const fh = imgH + PAD_T + PAD_B

        // Renderiza a polaroid inteira num canvas (com rotação)
        const RES = 3
        const diagW = Math.ceil(Math.sqrt(fw*fw + fh*fh)) + 4
        const cv = document.createElement('canvas')
        cv.width = diagW * RES; cv.height = diagW * RES
        const ctx = cv.getContext('2d')!
        const rad = angleDeg * Math.PI / 180

        ctx.translate(cv.width/2, cv.height/2)
        ctx.rotate(rad)
        ctx.translate(-fw*RES/2, -fh*RES/2)

        // Sombra
        ctx.shadowColor = 'rgba(40,28,18,0.22)'
        ctx.shadowBlur = 12 * RES
        ctx.shadowOffsetX = 3 * RES
        ctx.shadowOffsetY = 3 * RES

        // Corpo branco da polaroid
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, fw*RES, fh*RES)
        ctx.shadowColor = 'transparent'

        // Borda fina sépia
        ctx.strokeStyle = '#C8B89A'
        ctx.lineWidth = 0.5 * RES
        ctx.strokeRect(0, 0, fw*RES, fh*RES)

        // Área da foto com clip correto (cover crop dentro da polaroid)
        const px = PAD_S*RES, py = PAD_T*RES
        const pw = imgW*RES, ph = imgH*RES

        ctx.save()
        ctx.beginPath()
        ctx.rect(px, py, pw, ph)
        ctx.clip()
        ctx.fillStyle = '#E8DAC6'
        ctx.fillRect(px, py, pw, ph)
        if (url) {
          const raw = await loadImage(url).catch(() => null)
          if (raw) {
            const tmp2 = new Image()
            await new Promise(r => { tmp2.onload=r; tmp2.onerror=r; tmp2.src=raw })
            const iw = tmp2.naturalWidth||4, ih = tmp2.naturalHeight||3
            const sc = Math.max(pw/iw, ph/ih)
            const dw = iw*sc, dh = ih*sc
            ctx.drawImage(tmp2, 0, 0, iw, ih,
              px-(dw-pw)/2, py-(dh-ph)/2, dw, dh)
          }
        }
        ctx.restore()

        // Borda interna dourada
        ctx.strokeStyle = '#B9945A'
        ctx.lineWidth = 0.4 * RES
        ctx.strokeRect(px, py, pw, ph)

        // Legenda na faixa branca inferior
        ctx.fillStyle = '#786037'
        ctx.font = `italic ${9*RES}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.fillText(caption.toLowerCase(), fw*RES/2, (PAD_T+imgH+15)*RES)

        // Pequenos cantos decorativos (triângulos dourados)
        ctx.fillStyle = '#C9A96E'
        const cs = 5*RES
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(cs,0); ctx.lineTo(0,cs); ctx.fill()
        ctx.beginPath(); ctx.moveTo(fw*RES,0); ctx.lineTo(fw*RES-cs,0); ctx.lineTo(fw*RES,cs); ctx.fill()
        ctx.beginPath(); ctx.moveTo(0,fh*RES); ctx.lineTo(cs,fh*RES); ctx.lineTo(0,fh*RES-cs); ctx.fill()
        ctx.beginPath(); ctx.moveTo(fw*RES,fh*RES); ctx.lineTo(fw*RES-cs,fh*RES); ctx.lineTo(fw*RES,fh*RES-cs); ctx.fill()

        const imgData = cv.toDataURL('image/png')
        const dMM = diagW
        doc.addImage(imgData, 'PNG', cx-dMM/2, cy-dMM/2, dMM, dMM, undefined, 'FAST')

        return { topY: cy - fh/2, bottomY: cy + fh/2 + Math.abs(angleDeg)*0.3 }
      }

      // ── Rodapé elegante ───────────────────────────────────────
      const footer = (pageNum: number) => {
        ln(M+10, H-18, W-M-10, H-18, GOLD, 0.4)
        ornament(MID, H-18)
        T(`— ${pageNum} —`, MID, H-12, 8, SEPIA, 'center')
      }

      // ══════════════════════════════════════════════════════════
      // CAPA
      // ══════════════════════════════════════════════════════════
      bg(CREAM)
      pageBorder()

      // Ornamento topo
      ornament(MID, 28, 100)

      // Duas fotos dos primeiros momentos, lado a lado com inclinação oposta
      const fw1 = 82, fh1 = 96
      const fw2 = 82, fh2 = 96

      // Pega as 2 primeiras fotos disponíveis nos momentos
      const momentosComFoto = moments.filter(m => m.photo_url)
      const coverUrl1 = momentosComFoto[0]?.photo_url || null
      const coverUrl2 = momentosComFoto[1]?.photo_url || null

      // Foto 1 — inclinada -4deg (esquerda)
      const cf1cx = MID - 46, cf1cy = 108
      const RES3 = 3
      const buildTiltedFrame = async (
        url: string|null, fw: number, fh: number, angle: number
      ): Promise<string> => {
        const diag = Math.ceil(Math.sqrt(fw*fw+fh*fh))+8
        const cv = document.createElement('canvas')
        cv.width=diag*RES3; cv.height=diag*RES3
        const ctx = cv.getContext('2d')!
        ctx.translate(cv.width/2, cv.height/2)
        ctx.rotate(angle*Math.PI/180)
        ctx.translate(-fw*RES3/2, -fh*RES3/2)
        // sombra
        ctx.shadowColor='rgba(40,28,18,0.2)'; ctx.shadowBlur=10*RES3
        ctx.shadowOffsetX=2*RES3; ctx.shadowOffsetY=3*RES3
        // moldura escura
        ctx.fillStyle=`rgb(${DARK[0]},${DARK[1]},${DARK[2]})`
        ctx.fillRect(0,0,fw*RES3,fh*RES3)
        ctx.shadowColor='transparent'
        // passepartout creme
        const PAD=4*RES3
        ctx.fillStyle='#FAF6F0'
        ctx.fillRect(PAD,PAD,fw*RES3-PAD*2,fh*RES3-PAD*2)
        // foto
        const px2=PAD+2*RES3, py2=PAD+2*RES3
        const pw2=fw*RES3-PAD*2-4*RES3, ph2=fh*RES3-PAD*2-4*RES3
        ctx.save()
        ctx.beginPath(); ctx.rect(px2,py2,pw2,ph2); ctx.clip()
        ctx.fillStyle='#E8DAC6'; ctx.fillRect(px2,py2,pw2,ph2)
        if (url) {
          const raw = await loadImage(url).catch(()=>null)
          if (raw) {
            const img2 = new Image()
            await new Promise(r=>{img2.onload=r;img2.onerror=r;img2.src=raw})
            const iw=img2.naturalWidth||4,ih=img2.naturalHeight||3
            const sc=Math.max(pw2/iw,ph2/ih)
            const dw=iw*sc,dh=ih*sc
            ctx.drawImage(img2,0,0,iw,ih,px2-(dw-pw2)/2,py2-(dh-ph2)/2,dw,dh)
          }
        }
        ctx.restore()
        // borda dourada interna
        ctx.strokeStyle='#C9A96E'; ctx.lineWidth=0.4*RES3
        ctx.strokeRect(px2,py2,pw2,ph2)
        return cv.toDataURL('image/png')
      }

      const frame1 = await buildTiltedFrame(coverUrl1, fw1, fh1, -4)
      const frame2 = await buildTiltedFrame(coverUrl2, fw2, fh2, 4)
      const d1 = Math.ceil(Math.sqrt(fw1*fw1+fh1*fh1))+8
      const d2 = Math.ceil(Math.sqrt(fw2*fw2+fh2*fh2))+8
      doc.addImage(frame1,'PNG', cf1cx-d1/2, cf1cy-d1/2, d1, d1, undefined,'FAST')
      doc.addImage(frame2,'PNG', MID+46-d2/2, cf1cy-d2/2, d2, d2, undefined,'FAST')

      // Texto da capa
      const coupleName = couple?.couple_name || 'Roberto e Rosana'
      const textY = cf1cy + fh1/2 + 16

      ornament(MID, textY, 90)
      T('NOSSA HISTORIA', MID, textY+12, 8, SEPIA, 'center', undefined, 'normal')
      // espaçamento
      const nameSize = coupleName.length > 18 ? 22 : 26
      T(coupleName, MID, textY+30, nameSize, DARK, 'center', W-M*2, 'italic')
      T('4 DE ABRIL DE 2025', MID, textY+44, 8, SEPIA, 'center', undefined, 'normal')
      ornament(MID, textY+52, 80)

      // Citação
      T('"e foi assim que comecou a nossa historia"', MID, textY+68, 9.5, SEPIA, 'center', W-M*3, 'italic')

      // Ornamento rodapé da capa
      ornament(MID, H-22, 90)

      // ══════════════════════════════════════════════════════════
      // MOMENTOS
      // ══════════════════════════════════════════════════════════
      let pageNum = 1
      for (let mi = 0; mi < moments.length; mi++) {
        const m = moments[mi]
        const angle = mi % 2 === 0 ? -4 : 4   // alterna esquerda/direita
        const dateStr = new Date(m.moment_date)
          .toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})
          .toUpperCase()

        doc.addPage(); pageNum++
        bg(CREAM); pageBorder()

        // Data em smallcaps
        ln(M+10, 26, W-M-10, 26, GOLD, 0.35)
        T(dateStr, MID, 23, 7.5, SEPIA, 'center', undefined, 'normal')

        // Título do momento
        T(m.title || 'Momento', MID, 40, 22, DARK, 'center', W-M*2, 'italic')
        ornament(MID, 48, 80)

        let y = 56

        // Iniciais do casal para a moldura decorativa
        const coupleInitials = coupleName.split(' ').filter((w:string)=>w.length>2).slice(0,2).map((w:string)=>w[0]).join('&')

        if (m.photo_url) {
          // Com foto: polaroid inclinada normal
          const pImgW = 140, pImgH = m.description ? 100 : 128
          const pcy = y + (pImgH/2) + 14
          const pol = await polaroidTilted(m.photo_url, MID, pcy, pImgW, pImgH, m.title||'', angle)
          y = pol.bottomY + 12
        } else {
          // Sem foto: moldura decorativa com iniciais + citação gerada pela IA
          const frameW = 148, frameH = 110
          const fcy = y + frameH/2 + 10
          noPhotoFrame(MID, fcy, frameW, frameH, coupleInitials)
          y = fcy + frameH/2 + 16

          const quote = await generateQuote(m.title || '', m.description || '')
          ornament(MID, y, 70); y += 10
          T(`"${quote}"`, MID, y, 10.5, SEPIA, 'center', W-M*3, 'italic')
          y += doc.setFontSize(10.5).splitTextToSize(`"${quote}"`, W-M*3).length * 5.5 + 6
        }

        // Texto/descrição (só quando tem foto; sem foto a citação já foi exibida acima)
        if (m.photo_url && m.description) {
          ornament(MID, y, 70); y += 10
          T(`"${m.description}"`, MID, y, 10, SEPIA, 'center', W-M*3, 'italic')
          y += doc.setFontSize(10).splitTextToSize(`"${m.description}"`, W-M*3).length * 5 + 6
        }

        footer(pageNum)
      }

      // ══════════════════════════════════════════════════════════
      // SEPARADOR DE CAPÍTULO
      // ══════════════════════════════════════════════════════════
      const chapterPage = (title: string, sub: string) => {
        doc.addPage(); pageNum++
        // Fundo creme claro elegante
        const CHAPTER_BG = [242, 234, 220] as [number,number,number]  // bege quente claro
        doc.setFillColor(...CHAPTER_BG); doc.rect(0, 0, W, H, 'F')
        // Borda dupla dourada
        doc.setDrawColor(...GOLD); doc.setLineWidth(0.7); doc.rect(10,10,W-20,H-20)
        doc.setLineWidth(0.25); doc.rect(14,14,W-28,H-28)

        // Ornamentos topo e base
        ornament(MID, 28, 100)
        ornament(MID, H-28, 100)

        // Monograma translúcido (texto grande em baixa opacidade)
        const initials = coupleName.split(' ').filter(w=>w.length>2).slice(0,2).map(w=>w[0]).join('&')
        doc.setFontSize(88); doc.setTextColor(185,148,80)
        doc.setFont('times','italic'); doc.setGState(new (doc as any).GState({opacity:0.12}))
        doc.text(initials, MID, H/2+16, {align:'center'})
        doc.setGState(new (doc as any).GState({opacity:1}))

        // Texto do capítulo
        T('CAPITULO', MID, H/2-24, 8, GOLD, 'center', undefined, 'normal')
        ln(MID-50, H/2-18, MID+50, H/2-18, GOLD, 0.4)
        T(title, MID, H/2+2, 26, DARK, 'center', W-M*3, 'italic')
        ln(MID-50, H/2+10, MID+50, H/2+10, GOLD, 0.4)
        T(sub, MID, H/2+22, 9, SEPIA, 'center', W-M*3, 'italic')
      }

      // ══════════════════════════════════════════════════════════
      // CARTA
      // ══════════════════════════════════════════════════════════
      if (letters.wedding?.text) {
        chapterPage('Nossa Carta', 'uma historia de amor')

        doc.addPage(); pageNum++
        bg(CREAM); pageBorder()

        ornament(MID, 28, 90)
        T('CARTA DO CASAMENTO', MID, 24, 8, SEPIA, 'center', undefined, 'normal')

        // Papel de carta com linhas pautadas
        const cX = M+6, cY = 38, cW = W-M*2-12, cH = H-70
        doc.setFillColor(255,252,248); doc.rect(cX, cY, cW, cH, 'F')
        doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.rect(cX, cY, cW, cH)
        // Linha vermelha vertical (papel carta)
        ln(cX+12, cY, cX+12, cY+cH, [200,160,140], 0.3)
        // Linhas pautadas
        for (let ly = cY+10; ly < cY+cH-4; ly += 7)
          ln(cX+2, ly, cX+cW-2, ly, LGRAY, 0.18)

        T(letters.wedding.text, cX+16, cY+12, 10.5, DARK, 'left', cW-20, 'italic')

        ornament(MID, H-22, 80)
        footer(pageNum)
      }

      // ══════════════════════════════════════════════════════════
      // CONVIDADOS
      // ══════════════════════════════════════════════════════════
      if (guestPosts.length > 0) {
        chapterPage('Mensagens da Familia', 'palavras de quem amamos')
        doc.addPage(); pageNum++
        bg(CREAM); pageBorder()
        ornament(MID, 28, 90)
        T('MENSAGENS', MID, 24, 8, SEPIA, 'center')
        let gy = 40
        for (const p of guestPosts) {
          if (gy > 250) { doc.addPage(); pageNum++; bg(CREAM); pageBorder(); gy=30 }
          ln(M+10, gy, W-M-10, gy, GOLD, 0.3); gy += 8
          T(p.name, MID, gy, 12, DARK, 'center', undefined, 'italic'); gy += 7
          T(`"${p.message}"`, MID, gy, 9.5, SEPIA, 'center', W-M*3, 'italic')
          gy += doc.setFontSize(9.5).splitTextToSize(`"${p.message}"`,W-M*3).length*5.5+10
        }
        footer(pageNum)
      }

      // ══════════════════════════════════════════════════════════
      // PÁGINA FINAL
      // ══════════════════════════════════════════════════════════
      doc.addPage(); pageNum++
      const FINAL_BG = [242, 234, 220] as [number,number,number]
      doc.setFillColor(...FINAL_BG); doc.rect(0,0,W,H,'F')
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.7); doc.rect(10,10,W-20,H-20)
      doc.setLineWidth(0.25); doc.rect(14,14,W-28,H-28)

      ornament(MID, 30, 90)
      ornament(MID, H-30, 90)

      // Monograma grande translúcido
      const initials2 = coupleName.split(' ').filter((w: string)=>w.length>2).slice(0,2).map((w: string)=>w[0]).join('&')
      doc.setFontSize(96); doc.setTextColor(185,148,80)
      doc.setFont('times','italic'); doc.setGState(new (doc as any).GState({opacity:0.12}))
      doc.text(initials2, MID, H/2+20, {align:'center'})
      doc.setGState(new (doc as any).GState({opacity:1}))

      T('feito com amor', MID, H/2-18, 9, GOLD, 'center', undefined, 'italic')
      ln(MID-55, H/2-10, MID+55, H/2-10, GOLD, 0.4)
      T(coupleName, MID, H/2+8, 24, DARK, 'center', W-M*3, 'italic')
      ln(MID-55, H/2+16, MID+55, H/2+16, GOLD, 0.4)
      T(String(new Date().getFullYear()), MID, H/2+28, 9, SEPIA, 'center')

      doc.save(`nossa-historia-${coupleName.replace(/\s/g,'-')}.pdf`)
      setDone(true)
      setTimeout(() => setDone(false), 5000)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #D4C4A0' }}>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{ background: '#FAF6F0', color: '#786037', border: '1px solid #C9A96E' }}>←</button>
        <h2 className="text-base font-semibold" style={{ color: '#28180A' }}>Exportar livro em PDF</h2>
      </div>
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#28180A', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Nosso livro de casamento</h2>
          <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#786037' }}>
            Album elegante com fotos, polaroids inclinadas, ornamentos dourados e toda a nossa historia.
          </p>
        </div>
        <div className="rounded-xl p-4 mb-5" style={{ background: '#FAF6F0', border: '1px solid #C9A96E' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#786037', letterSpacing: '0.15em' }}>Conteudo do livro</p>
          {[
            { icon: '📷', label: 'Capa com 2 fotos', sub: 'primeiros 2 momentos, inclinadas' },
            { icon: '🖼', label: `${moments.length} momentos`, sub: 'polaroids inclinadas, alternando' },
            { icon: '✉️', label: 'Carta do casamento', sub: letters.wedding?.text ? 'escrita' : 'ainda nao escrita' },
            { icon: '💬', label: `${guestPosts.length} mensagens`, sub: 'de familia e amigos' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#E8D8B0' }}>
              <span className="text-lg w-7">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#28180A' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#786037' }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={generatePDF} disabled={generating||done}
          className="w-full py-4 rounded-xl text-base font-semibold disabled:opacity-60"
          style={{ background: generating||done ? '#C9A96E' : '#28180A', color: '#FAF6F0' }}>
          {done ? 'PDF baixado com sucesso!' : generating ? 'Gerando...' : 'Gerar e baixar PDF'}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: '#B09060' }}>
          Gerado no seu dispositivo
        </p>
      </div>
    </Layout>
  )
}
