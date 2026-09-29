import React, { useEffect } from 'react';
import { X, Lock, FileText, Code, HardDrive, Archive, Paperclip, ExternalLink } from 'lucide-react';

/**
 * Formatea cualquier URL de Google Drive para visualización segura embebida en iframe (/preview)
 */
export function formatEmbedUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  // Patrones de Google Drive
  if (trimmed.includes('drive.google.com')) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) {
      return `https://drive.google.com/file/d/${idParamMatch[1]}/preview`;
    }
    if (trimmed.includes('/preview')) return trimmed;
    return trimmed.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  }

  return trimmed;
}

export default function MaterialFrameViewerModal({ material, groupName = '', onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!material) return null;

  const embedUrl = formatEmbedUrl(material.url);
  const isDrive = material.provider === 'drive' || material.url?.includes('drive.google.com');

  const getIcon = () => {
    const p = material.provider || '';
    const t = material.material_type || '';
    if (p === 'drive' || t === 'drive') return <HardDrive size={18} color="#0F9D58" />;
    if (p === 'github' || t === 'code') return <Code size={18} color="#24292e" />;
    if (t === 'pdf') return <FileText size={18} color="#DC2626" />;
    if (t === 'archive') return <Archive size={18} color="#F59E0B" />;
    return <Paperclip size={18} color="var(--gold-dark, #b45309)" />;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1080px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          animation: 'fadeSlideUp 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del visor seguro */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: '#FAFBFD'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(20, 33, 61, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {getIcon()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: 'var(--navy, #14213D)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {material.title || 'Documento del Grupo'}
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                  title="Este visor no permite descargas"
                >
                  <Lock size={11} /> Solo Visualización
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                {groupName ? `Grupo: ${groupName}` : 'Material de Grupo'}
                {material.file_name && (
                  <span style={{ marginLeft: '0.5rem', color: '#94A3B8' }}>• {material.file_name}</span>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar visor"
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#E2E8F0')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#F1F5F9')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Marco embebido seguro (Iframe) */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#0F172A',
            userSelect: 'none'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Bloqueador invisible sobre la esquina superior derecha para impedir el botón de pop-out/descarga de Google Drive */}
          {isDrive && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '90px',
                height: '65px',
                zIndex: 35,
                background: 'transparent',
                cursor: 'default'
              }}
              title="Descarga inhabilitada"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}

          <iframe
            src={embedUrl}
            title={material.title || 'Visor Seguro de Documento'}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
}
