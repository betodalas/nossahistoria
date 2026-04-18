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

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210
      const pink = [190, 24, 93] as [number,number,number]
      const purple = [107, 33, 168] as [number,number,number]
      const light = [243, 232, 255] as [number,number,number]
      const dark = [15, 10, 26] as [number,number,number]
      const gray = [100, 80, 130] as [number,number,number]

      let y = 0

      const addPage = (gradient = false) => {
        doc.addPage()
        doc.setFillColor(...dark)
        doc.rect(0, 0, 210, 297, 'F')
        y = 20
      }

      const addText = (text: string, x: number, size: number, color: [number,number,number], align: 'left'|'center'|'right' = 'left', maxWidth?: number) => {
        doc.setFontSize(size)
        doc.setTextColor(...color)
        if (maxWidth) {
          const lines = doc.splitTextToSize(text, maxWidth)
          doc.text(lines, x, y, { align })
          y += lines.length * (size * 0.4) + 2
        } else {
          doc.text(text, x, y, { align })
          y += size * 0.4 + 2
        }
      }

      // CAPA
      doc.setFillColor(...dark)
      doc.rect(0, 0, 210, 297, 'F')
      doc.setFillColor(...purple)
      doc.setGState(new (doc as any).GState({ opacity: 0.3 }))
      doc.ellipse(105, 100, 80, 80, 'F')
      doc.setFillColor(...pink)
      doc.ellipse(105, 180, 60, 60, 'F')
      doc.setGState(new (doc as any).GState({ opacity: 1 }))

      y = 80
      doc.setFontSize(36)
      doc.setTextColor(...light)
      doc.text('Nossa', 105, y, { align: 'center' })
      y += 16
      doc.text('História', 105, y, { align: 'center' })
      y += 20
      doc.setFontSize(14)
      doc.setTextColor(...gray)
      doc.text(couple?.couple_name || 'Nosso casal', 105, y, { align: 'center' })
      y += 10
      if (couple?.wedding_date) {
        doc.setFontSize(11)
        doc.text(new Date(couple.wedding_date).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'}), 105, y, { align: 'center' })
      }
      y += 20
      doc.setFontSize(10)
      doc.setTextColor(80, 60, 100)
      doc.text(`${moments.length} momentos · ${answers.length} perguntas · ${guestPosts.length} mensagens`, 105, y, { align: 'center' })

      // CAPÍTULO 1 — MOMENTOS
      if (moments.length > 0) {
        addPage()
        doc.setFillColor(...purple)
        doc.setGState(new (doc as any).GState({ opacity: 0.15 }))
        doc.rect(0, 0, 210, 40, 'F')
        doc.setGState(new (doc as any).GState({ opacity: 1 }))
        y = 15
        addText('Capítulo 1', 105, 10, gray, 'center')
        addText('Nossos Momentos', 105, 22, light, 'center')
        y += 10

        for (const m of moments) {
          if (y > 250) addPage()
          doc.setDrawColor(...purple)
          doc.setLineWidth(0.5)
          doc.line(20, y, 190, y)
          y += 6
          addText(new Date(m.moment_date).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'}), 20, 9, gray)
          addText(m.title, 20, 13, light, 'left', 170)
          if (m.description) addText(m.description, 20, 10, gray, 'left', 170)
          if (m.music_name) { y += 2; addText(`♪  ${m.music_name}`, 20, 9, purple) }
          if (m.photo_url) {
            try {
              if (y > 200) addPage()
              let imgData = m.photo_url
              if (!imgData.startsWith('data:')) {
                const resp = await fetch(m.photo_url)
                const blob = await resp.blob()
                imgData = await new Promise<string>((res) => {
                  const reader = new FileReader()
                  reader.onload = () => res(reader.result as string)
                  reader.readAsDataURL(blob)
                })
              }
              const imgH = 60
              doc.addImage(imgData, 'JPEG', 20, y, 170, imgH, undefined, 'MEDIUM')
              y += imgH + 5
            } catch {}
          }
          y += 5
        }
      }

      // CAPÍTULO 2 — PERGUNTAS
      if (answers.length > 0) {
        addPage()
        doc.setFillColor(...pink)
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }))
        doc.rect(0, 0, 210, 40, 'F')
        doc.setGState(new (doc as any).GState({ opacity: 1 }))
        y = 15
        addText('Capítulo 2', 105, 10, gray, 'center')
        addText('Nossas Respostas', 105, 22, light, 'center')
        y += 10

        for (const a of answers.slice(0,20)) {
          if (y > 240) addPage()
          doc.setDrawColor(...pink)
          doc.setLineWidth(0.3)
          doc.line(20, y, 190, y)
          y += 5
          addText(`"${a.question}"`, 20, 9, gray, 'left', 170)
          y += 1
          addText(`Você: ${a.myAnswer}`, 20, 10, light, 'left', 170)
          if (a.partnerAnswer) addText(`${couple?.partner_name || 'Parceiro(a)'}: ${a.partnerAnswer}`, 20, 10, [190,150,220], 'left', 170)
          y += 4
        }
      }

      // CAPÍTULO 3 — CARTA
      if (letters.wedding?.text) {
        addPage()
        y = 15
        addText('Capítulo 3', 105, 10, gray, 'center')
        addText('Nossa Carta', 105, 22, light, 'center')
        y += 10
        addText('Carta escrita antes do casamento:', 20, 10, gray, 'left', 170)
        y += 3
        addText(letters.wedding.text, 20, 11, light, 'left', 170)
      }

      // CAPÍTULO 4 — MENSAGENS DOS CONVIDADOS
      if (guestPosts.length > 0) {
        addPage()
        y = 15
        addText('Capítulo 4', 105, 10, gray, 'center')
        addText('Mensagens da Família', 105, 22, light, 'center')
        y += 10

        for (const p of guestPosts) {
          if (y > 250) addPage()
          doc.setFillColor(30, 20, 50)
          doc.roundedRect(15, y-3, 180, 1, 2, 2, 'F')
          y += 4
          addText(p.name, 20, 12, light)
          addText(p.message, 20, 10, gray, 'left', 170)
          y += 4
        }
      }

      // PÁGINA FINAL
      addPage()
      y = 100
      addText('💜', 105, 30, light, 'center')
      y += 5
      addText('Gerado com amor pelo', 105, 10, gray, 'center')
      addText('Nossa História', 105, 18, light, 'center')
      y += 5
      addText(new Date().toLocaleDateString('pt-BR'), 105, 10, gray, 'center')

      doc.save(`nossa-historia-${couple?.couple_name?.replace(/\s/g,'-') || 'casal'}.pdf`)
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

        {/* Preview do conteúdo */}
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
