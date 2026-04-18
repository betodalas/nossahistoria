
import { useNavigate } from 'react-router-dom';

export default function FloatingButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/novo-momento')}
      style={{
        position: 'fixed',
        bottom: '90px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#FF6B6B',
        color: '#fff',
        fontSize: '32px',
        border: 'none',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        zIndex: 9999,
        cursor: 'pointer'
      }}
    >
      +
    </button>
  );
}
