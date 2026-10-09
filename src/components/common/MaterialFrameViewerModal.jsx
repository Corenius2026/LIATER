import React, { useEffect } from 'react';
import {
  X, Lock, Unlock, FileText, Code, HardDrive, Archive, Paperclip,
  ExternalLink, Download, Layers, FileSpreadsheet
} from 'lucide-react';
import {
  triggerResourceDownload,
  isMaterialDownloadable,
  isNonPreviewableFormat,
  getFileExtension
} from '@/utils/resourceUtils';

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
  const downloadable = isMaterialDownloadable(material);
  const nonPreviewable = isNonPreviewableFormat(
    material.file_name,
    material.material_type,
    material.url,
    material.title
  );
  const ext = getFileExtension(material.file_name, material.url, material.title);

  const getIcon = (size = 18) => {
    const p = material.provider || '';
    const t = material.material_type || '';
    const extLow = ext.toLowerCase();

    if (['dwg', 'dxf', 'rvt', 'ifc', 'skp'].includes(extLow)) {
      return <Layers size={size} color="#0284C7" />;
    }
    if (['xlsx', 'xls', 'csv', 'ods'].includes(extLow)) {
      return <FileSpreadsheet size={size} color="#16A34A" />;
    }
    if (extLow === 'pdf' || t === 'pdf') {
      return <FileText size={size} color="#DC2626" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extLow) || t === 'archive') {
      return <Archive size={size} color="#F59E0B" />;
    }
    if (['doc', 'docx'].includes(extLow)) {
      return <FileText size={size} color="#2563EB" />;
    }
    if (p === 'github' || t === 'code') return <Code size={size} color="#24292e" />;
    if (p === 'drive' || t === 'drive') return <HardDrive size={size} color="#0F9D58" />;
    return <Paperclip size={size} color="var(--gold-dark, #b45309)" />;
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
              {getIcon(18)}
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
                {downloadable ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#DCFCE7',
                      color: '#15803D',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}
                    title="Este archivo se puede descargar libremente"
                  >
                    <Download size={11} /> Descarga Habilitada
                  </span>
                ) : (
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
                    title="Modo protegido: solo visualización"
                  >
                    <Lock size={11} /> Solo Visualización
                  </span>
                )}
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
            {downloadable && (
              <button
                type="button"
                onClick={() => triggerResourceDownload(material.url, material.file_name || material.title)}
                title="Descargar este archivo a tu equipo"
                style={{
                  background: '#15803D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#166534')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#15803D')}
              >
                <Download size={14} />
                <span>Descargar</span>
              </button>
            )}

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

        {/* Cuerpo del Visor */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#0F172A',
            userSelect: 'none',
            display: 'flex'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {nonPreviewable ? (
            /* Vista para formatos que no se pueden previsualizar en web (.dwg, Excel, ZIP) */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                color: '#FFFFFF'
              }}
            >
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                {getIcon(36)}
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
                {material.title || 'Archivo de Grupo'}
              </h4>
              {material.file_name && (
                <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem', fontFamily: 'monospace' }}>
                  {material.file_name}
                </div>
              )}
              <p style={{ margin: '0 0 1.75rem 0', maxWidth: '520px', color: '#CBD5E1', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Los archivos con formato <strong>.{ext.toUpperCase() || 'especializado'}</strong> (como planos CAD o planillas Excel) no cuentan con visualizador web directo en el navegador.
                <br />
                Descárgalo a tu equipo para abrirlo con el software correspondiente.
              </p>
              <button
                type="button"
                onClick={() => triggerResourceDownload(material.url, material.file_name || material.title)}
                style={{
                  background: '#FCA311',
                  color: '#14213D',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(252, 163, 17, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Download size={18} />
                <span>Descargar Archivo ({ext.toUpperCase() || 'Directo'})</span>
              </button>
            </div>
          ) : (
            /* Vista embebida en iframe (para PDFs e imágenes) */
            <>
              {/* Bloqueador invisible sobre la esquina superior derecha para impedir descarga cuando está restringida */}
              {isDrive && !downloadable && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
