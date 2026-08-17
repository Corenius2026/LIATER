import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Componente TimePicker24h
 * Selector de hora estricto en formato 24 horas (00:00 a 23:59).
 * Evita la interferencia de los ajustes regionales de Windows/navegadores que forzaban formato 12h (AM/PM).
 */
export default function TimePicker24h({ value = '18:00', onChange, style = {} }) {
  const parts = (value || '18:00').split(':');
  const currentHour = parts[0] ? parts[0].padStart(2, '0') : '18';
  const currentMin = parts[1] ? parts[1].padStart(2, '0') : '00';

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleHourChange = (e) => {
    const newHour = e.target.value;
    onChange && onChange(`${newHour}:${currentMin}`);
  };

  const handleMinChange = (e) => {
    const newMin = e.target.value;
    onChange && onChange(`${currentHour}:${newMin}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '6px',
        padding: '0.45rem 0.6rem',
        gap: '4px',
        width: '100%',
        boxSizing: 'border-box',
        height: '38px',
        ...style
      }}
    >
      <Clock size={15} color="var(--text-muted, #64748b)" style={{ flexShrink: 0, marginRight: '2px' }} />
      <select
        value={currentHour}
        onChange={handleHourChange}
        style={{
          border: 'none',
          background: 'transparent',
          fontWeight: 700,
          color: 'var(--navy, #14213D)',
          fontSize: '0.88rem',
          outline: 'none',
          cursor: 'pointer',
          padding: '2px',
          fontFamily: 'inherit'
        }}
        title="Hora (00 - 23)"
      >
        {hours.map(h => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span style={{ fontWeight: 800, color: 'var(--navy, #14213D)', fontSize: '0.88rem', userSelect: 'none' }}>:</span>
      <select
        value={currentMin}
        onChange={handleMinChange}
        style={{
          border: 'none',
          background: 'transparent',
          fontWeight: 700,
          color: 'var(--navy, #14213D)',
          fontSize: '0.88rem',
          outline: 'none',
          cursor: 'pointer',
          padding: '2px',
          fontFamily: 'inherit'
        }}
        title="Minutos (00 - 59)"
      >
        {minutes.map(m => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', marginLeft: 'auto', paddingLeft: '4px' }}>
        hrs
      </span>
    </div>
  );
}
