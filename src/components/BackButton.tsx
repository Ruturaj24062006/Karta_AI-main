import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type BackButtonProps = {
  fallbackTo?: string;
  label?: string;
  className?: string;
};

function BackButton({ fallbackTo = '/', label = 'Back', className }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // If there is browser history, go back. Otherwise, use a safe app fallback route.
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        color: '#1e293b',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
      }}
      aria-label={label}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

export default BackButton;