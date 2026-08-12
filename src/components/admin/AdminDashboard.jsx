import React from 'react';
import { Users, GraduationCap, BookOpen, ListTree, Video, FileText, LayoutDashboard, Clock } from 'lucide-react';
import { formatShortDate } from '../../utils/dateUtils';

export default function AdminDashboard({ counts, upcomingClasses, isCourse }) {
  let stats = [
    { label: 'Alumnos Inscritos', value: counts?.usuarios || 0,  color: 'var(--navy)', bg: 'rgba(20, 33, 61, 0.08)', icon: <Users size={22} color="var(--navy)" /> },
    { label: 'Profesores',       value: counts?.profesores || 0, color: 'var(--gold-dark)', bg: 'var(--gold-subtle)', icon: <GraduationCap size={22} color="var(--gold-dark)" /> },
    { label: 'Módulos',          value: counts?.modulos || 0,    color: 'var(--green-700)', bg: '#f0fdf4', icon: <BookOpen size={22} color="var(--green-700)" /> },
    { label: 'Sesiones',         value: (counts?.sesiones ?? counts?.subtemas) || 0, color: 'var(--navy)', bg: 'rgba(20, 33, 61, 0.08)', icon: <ListTree size={22} color="var(--navy)" /> },
    { label: 'Clases',           value: counts?.clases || 0,     color: 'var(--gold-dark)', bg: 'var(--gold-subtle)', icon: <Video size={22} color="var(--gold-dark)" /> },
  ];

  if (isCourse) {
    stats = stats.filter(s => s.label !== 'Módulos');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeSlideUp 0.35s ease-out' }}>
      
      {/* TARJETAS DE ESTADÍSTICAS REFINADAS */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.15rem' }}>
        {stats.map(s => (
          <div className="stat-card" key={s.label} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div className="stat-icon" style={{ background: s.bg, width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>{s.icon}</div>
            <div className="stat-number" style={{ color: 'var(--navy)', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1 }}>{s.value ?? '0'}</div>
            <div className="stat-label" style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.35rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* SECCIÓN DOBLE: ESTADO Y PRÓXIMAS CLASES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Estado del Programa */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.05rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} color="var(--gold)" /> Estado del Programa
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {[
              { label: 'Total Clases Programadas', value: counts?.clases || 0, color: 'var(--green-600)' },
              !isCourse && { label: 'Total Módulos Publicados', value: counts?.modulos || 0, color: 'var(--navy)' },
            ].filter(Boolean).map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{item.value}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: item.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas Clases */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.05rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--gold-dark)" /> Próximas Clases Programadas
          </h3>
          {!upcomingClasses || upcomingClasses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0', margin: 0 }}>No hay clases próximas asignadas en este programa.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingClasses.map(cls => (
                <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-light)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--gold-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} color="var(--gold-dark)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.title}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {formatShortDate(cls.class_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
