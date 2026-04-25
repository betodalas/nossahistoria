/**
 * PushPermissionCard
 * Card exibido na tela de Perfil para gerenciar permissão de push notifications.
 * Mostra estado atual e botão de ação contextual.
 */

import { Bell, BellOff, Check } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import type { PushPermissionStatus } from '../hooks/usePushNotifications'

interface Props {
  status: PushPermissionStatus
  isRegistered: boolean
  onRequest: () => Promise<boolean>
}

export default function PushPermissionCard({ status, isRegistered, onRequest }: Props) {
  // Não exibir no browser web — push nativo só funciona no app
  if (!Capacitor.isNativePlatform()) return null

  const isGranted = status === 'granted'
  const isDenied = status === 'denied'

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #E8C4CE',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: isGranted
            ? 'linear-gradient(135deg, #d4edda, #a8d5b1)'
            : 'linear-gradient(135deg, #FADADD, #C9A0B0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isGranted
            ? <Check size={18} color="#2e7d32" />
            : isDenied
              ? <BellOff size={18} color="#7C4D6B" />
              : <Bell size={18} color="#7C4D6B" />
          }
        </div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#3D1A2A', margin: 0 }}>
            Notificações Push
          </p>
          <p style={{ fontSize: '11px', color: '#9B6B7A', margin: '1px 0 0' }}>
            {isGranted && isRegistered
              ? 'Ativas — você receberá avisos do casal'
              : isGranted
                ? 'Permissão concedida, registrando...'
                : isDenied
                  ? 'Bloqueadas — ative nas configurações do celular'
                  : 'Receba lembretes e avisos do seu amor'}
          </p>
        </div>
      </div>

      {/* Benefícios */}
      {!isGranted && (
        <ul style={{ margin: '0 0 12px', padding: '0 0 0 4px', listStyle: 'none' }}>
          {[
            '💍 Lembrete de aniversário de casamento',
            '📅 Outros aniversários especiais do casal',
            '💌 Nova pergunta do dia disponível',
            '📸 Quando seu amor adicionar um momento',
            '💬 Quando seu amor responder uma pergunta',
          ].map((item) => (
            <li key={item} style={{ fontSize: '12px', color: '#7C4D6B', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Botão de ação */}
      {!isGranted && !isDenied && (
        <button
          onClick={onRequest}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #C9A0B0, #7C4D6B)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🔔 Ativar Notificações
        </button>
      )}

      {isDenied && (
        <p style={{ fontSize: '11px', color: '#9B6B7A', textAlign: 'center', margin: 0 }}>
          Para ativar: Configurações → Aplicativos → Nossa História → Notificações
        </p>
      )}
    </div>
  )
}
