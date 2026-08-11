import { useState } from 'react';

export default function LiaterHeroAnimation() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        height: '460px',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, rgba(20, 33, 61, 0.5) 0%, rgba(10, 17, 34, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Indicador de carga suave mientras el modelo 3D inicializa */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            zIndex: 2,
            background: 'rgba(10, 17, 34, 0.8)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(252, 163, 17, 0.2)',
              borderTopColor: 'var(--gold, #FCA311)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.04em' }}>
            Cargando modelo 3D LIATER...
          </span>
        </div>
      )}

      {/* Visor 3D Interactivo Supavoxel */}
      <iframe
        src="https://supavoxel.com/embed/cmsp608t40abqvnwu3bxs48tt"
        title="Modelo 3D LIATER"
        width="100%"
        height="100%"
        style={{
          border: 'none',
          width: '100%',
          height: '100%',
          borderRadius: '24px',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out',
        }}
        allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
