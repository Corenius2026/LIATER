import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

/**
 * Componente TimePicker24h con menú desplegable hacia abajo y scroll compacto.
 * Muestra una tarjeta flotante de 2 columnas (Horas 00-23 y Minutos 00-59) con scroll suave.
 */
export default function TimePicker24h({ value = '18:00', onChange, style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hoursListRef = useRef(null);
  const minsListRef = useRef(null);

  const parts = (value || '18:00').split(':');
  const currentHour = parts[0] ? parts[0].padStart(2, '0') : '18';
  const currentMin = parts[1] ? parts[1].padStart(2, '0') : '00';

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Hacer scroll automático al elemento seleccionado al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hourEl = document.getElementById(`timepicker-h-${currentHour}`);
        if (hourEl && hoursListRef.current) {
          hoursListRef.current.scrollTop = hourEl.offsetTop - 45;
        }
        const minEl = document.getElementById(`timepicker-m-${currentMin}`);
        if (minEl && minsListRef.current) {
          minsListRef.current.scrollTop = minEl.offsetTop - 45;
        }
      }, 30);
    }
  }, [isOpen, currentHour, currentMin]);

  const handleSelectHour = (h) => {
    onChange && onChange(`${h}:${currentMin}`);
  };

  const handleSelectMin = (m) => {
    onChange && onChange(`${currentHour}:${m}`);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Botón Principal Disparador */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          border: isOpen ? '1.5px solid var(--navy, #14213D)' : '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '6px',
          padding: '0.45rem 0.65rem',
          width: '100%',
          height: '38px',
          boxSizing: 'border-box',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(20, 33, 61, 0.08)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={15} color="var(--gold-dark, #FCA311)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 800, color: 'var(--navy, #14213D)', fontSize: '0.92rem', letterSpacing: '0.02em' }}>
            {currentHour}:{currentMin}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
            hrs
          </span>
        </div>
        <ChevronDown
          size={14}
          color="var(--text-muted, #64748b)"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        />
      </button>

      {/* Menú Desplegable Flotante hacia abajo con Scroll */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '210px',
            background: '#ffffff',
            border: '1px solid var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(20, 33, 61, 0.06)',
            zIndex: 9999,
            padding: '0.55rem',
            animation: 'fadeSlideDown 0.15s ease-out',
            boxSizing: 'border-box'
          }}
        >
          {/* Cabeceras de columna */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', textAlign: 'center', letterSpacing: '0.05em' }}>
              Hora (24h)
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', textAlign: 'center', letterSpacing: '0.05em' }}>
              Minutos
            </span>
          </div>

          {/* Listas con scroll vertical hacia abajo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            {/* Columna Horas */}
            <div
              ref={hoursListRef}
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingRight: '2px',
                scrollbarWidth: 'thin'
              }}
            >
              {hours.map(h => {
                const isSelected = h === currentHour;
                return (
                  <button
                    key={h}
                    id={`timepicker-h-${h}`}
                    type="button"
                    onClick={() => handleSelectHour(h)}
                    style={{
                      padding: '0.32rem 0.3rem',
                      border: 'none',
                      borderRadius: '5px',
                      background: isSelected ? 'var(--navy, #14213D)' : 'transparent',
                      color: isSelected ? '#ffffff' : 'var(--navy, #14213D)',
                      fontWeight: isSelected ? 800 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background 0.12s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {/* Columna Minutos */}
            <div
              ref={minsListRef}
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingRight: '2px',
                scrollbarWidth: 'thin'
              }}
            >
              {minutes.map(m => {
                const isSelected = m === currentMin;
                return (
                  <button
                    key={m}
                    id={`timepicker-m-${m}`}
                    type="button"
                    onClick={() => handleSelectMin(m)}
                    style={{
                      padding: '0.32rem 0.3rem',
                      border: 'none',
                      borderRadius: '5px',
                      background: isSelected ? 'var(--gold, #FCA311)' : 'transparent',
                      color: isSelected ? '#14213D' : 'var(--navy, #14213D)',
                      fontWeight: isSelected ? 800 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background 0.12s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botón Listo */}
          <div style={{ marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'var(--navy, #14213D)',
                border: 'none',
                borderRadius: '4px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
