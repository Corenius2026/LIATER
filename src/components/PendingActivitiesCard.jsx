import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertCircle, FileText, CheckCircle2, Video, Bell, ChevronRight, RefreshCw, Award } from 'lucide-react';
import { formatShortDate } from '../utils/dateUtils';
import { fetchStudentPendingActivities } from '../services/activityService';

/**
 * Componente: PendingActivitiesCard
 * Muestra las actividades pendientes reales del estudiante autenticado desde Supabase.
 * Soporta Tareas (assignments), Cuestionarios (quizzes), Sesiones en vivo y Anuncios importantes.
 */
export default function PendingActivitiesCard({ studentId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pendings'); // 'pendings' | 'announcements'
  const [hasReadAnnouncements, setHasReadAnnouncements] = useState(false);

  const loadPending = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { activities: data, error: err } = await fetchStudentPendingActivities(studentId, 4);

    if (err) {
      setError(err);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const getUrgencyStyles = (urgency) => {
    switch (urgency) {
      case 'overdue':
        return {
          badgeBg: '#fef2f2',
          badgeColor: '#dc2626',
          borderColor: '#ef4444',
          label: 'Vencida'
        };
      case 'today':
      case 'tomorrow':
        return {
          badgeBg: '#fffbe6',
          badgeColor: '#d97706',
          borderColor: '#fca311',
          label: urgency === 'today' ? 'Hoy' : 'Mañana'
        };
      case 'upcoming':
      default:
        return {
          badgeBg: '#eff6ff',
          badgeColor: 'var(--navy)',
          borderColor: 'var(--navy)',
          label: 'Próxima'
        };
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'Sesión en vivo':
        return <Video size={16} color="var(--navy)" />;
      case 'Entrega':
        return <FileText size={16} color="var(--navy)" />;
      case 'Cuestionario':
      case 'Actividad de Reforzamiento':
      case 'Reforzamiento':
        return <Award size={16} color="#d97706" />;
      default:
        return <Bell size={16} color="var(--navy)" />;
    }
  };

  const pendingsList = activities.filter(a => a.type !== 'Anuncio importante');
  const announcementsList = activities.filter(a => a.type === 'Anuncio importante');
  const reinforcementCount = pendingsList.filter(a => a.type.includes('Reforzamiento') || a.type === 'Cuestionario').length;
  const currentList = (activeTab === 'pendings' ? pendingsList : announcementsList).slice(0, 4);

  return (
    <div className="card static-card" style={{ padding: '1.5rem' }}>
      {/* ENCABEZADO DE LA TARJETA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 700, margin: 0 }}>
          Pendientes y Avisos
        </h3>
        <Link to="/pendientes" style={{ fontSize: '0.82rem', color: 'var(--gold-dark)', fontWeight: 700, textDecoration: 'none' }}>
          Ver todos
        </Link>
      </div>

      {/* PESTAÑAS (TABS) CON ANIMACIÓN */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.04)', padding: '0.3rem', borderRadius: '10px' }}>
        <button
          onClick={() => setActiveTab('pendings')}
          style={{
            flex: 1,
            padding: '0.45rem 0.5rem',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'pendings' ? '#ffffff' : 'transparent',
            color: activeTab === 'pendings' ? 'var(--navy)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'pendings' ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: activeTab === 'pendings' ? 'scale(1.02)' : 'scale(1)',
            display: 'inline-flex',
            alignItems: 'center',
            justify: 'center',
            gap: '0.35rem'
          }}
          onMouseOver={e => {
            if (activeTab !== 'pendings') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseOut={e => {
            if (activeTab !== 'pendings') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
        >
          <span>Pendientes</span>
          {reinforcementCount > 0 && (
            <span 
              title="Tienes actividades de reforzamiento sin realizar"
              style={{
                background: '#fffbe6',
                color: '#b45309',
                border: '1px solid #fca311',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <Award size={11} color="#b45309" />
              {reinforcementCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('announcements');
            setHasReadAnnouncements(true);
          }}
          style={{
            flex: 1,
            padding: '0.45rem 0',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'announcements' ? '#ffffff' : 'transparent',
            color: activeTab === 'announcements' ? 'var(--navy)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'announcements' ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: activeTab === 'announcements' ? 'scale(1.02)' : 'scale(1)'
          }}
          onMouseOver={e => {
            if (activeTab !== 'announcements') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseOut={e => {
            if (activeTab !== 'announcements') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
        >
          Anuncios {!hasReadAnnouncements && announcementsList.length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '0.1rem 0.35rem', fontSize: '0.65rem', marginLeft: '0.2rem' }}>{announcementsList.length}</span>}
        </button>
      </div>

      {/* ESTADO DE CARGA SKELETON */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 0' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
                <div style={{ width: '80%', height: '14px', background: '#cbd5e1', borderRadius: '4px' }} />
                <div style={{ width: '50%', height: '12px', background: '#e2e8f0', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* ESTADO DE ERROR CON BOTÓN REINTENTAR */
        <div style={{ padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dc2626', color: '#ffffff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      ) : currentList.length === 0 ? (
        /* ESTADO VACÍO CUANDO EL ESTUDIANTE ESTÁ AL DÍA */
        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
          <CheckCircle2 size={38} color="var(--green-600)" style={{ marginBottom: '0.6rem', opacity: 0.85 }} />
          <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            {activeTab === 'pendings' ? 'No tienes actividades próximas.' : 'No tienes anuncios nuevos.'}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Estás al día.
          </p>
        </div>
      ) : (
        /* LISTADO DE ACTIVIDADES FILTRADAS CON ANIMACIÓN DE ENTRADA */
        <div key={activeTab} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', animation: 'fadeSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both' }}>
          {currentList.map((item) => {
            const urgencyStyle = getUrgencyStyles(item.urgency);
            const isAnnouncement = item.type === 'Anuncio importante';

            if (isAnnouncement) {
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    alignItems: 'flex-start',
                    padding: '0.9rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                    border: '1px solid #bae6fd',
                    borderLeft: '4px solid #0284c7',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)',
                    cursor: 'default'
                  }}
                >
                  {/* ICONO DE ANUNCIO */}
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                    <Bell size={18} color="#0284c7" />
                  </div>

                  {/* DETALLES DEL ANUNCIO */}
                  <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Aviso Institucional
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1' }}>
                        Importante
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)', margin: 0, lineHeight: 1.35 }}>
                      {item.title}
                    </h4>

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      Publicado el {formatShortDate(item.date)}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.link}
                onClick={() => {
                  if (item.programId) {
                    localStorage.setItem('activeProgramId', item.programId);
                    window.dispatchEvent(new Event('programContextChanged'));
                  }
                }}
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'center',
                  padding: '0.85rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                  border: '1px solid rgba(20, 33, 61, 0.08)',
                  borderLeft: `4px solid ${urgencyStyle.borderColor}`,
                  boxShadow: '0 4px 12px rgba(20, 33, 61, 0.04)',
                  textDecoration: 'none',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(20, 33, 61, 0.08)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 33, 61, 0.04)'; }}
              >
                {/* ICONO COMPACTO CON COLOR DE URGENCIA */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: urgencyStyle.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {renderIcon(item.type)}
                </div>

                {/* DETALLES DE LA ACTIVIDAD */}
                <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '999px', background: urgencyStyle.badgeBg, color: urgencyStyle.badgeColor }}>
                      {item.statusLabel || urgencyStyle.label}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.programTitle}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.type === 'Sesión en vivo' || item.type === 'Clase hoy' ? 'Próxima clase: ' : 'Cierra: '}
                      {formatShortDate(item.date)}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
