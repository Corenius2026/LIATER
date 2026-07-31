import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Clock, AlertCircle, FileText, CheckCircle2, Video, Bell, ChevronRight, RefreshCw } from 'lucide-react';
import { formatShortDate } from '../utils/dateUtils';

/**
 * Componente: PendingActivitiesCard
 * Reemplaza completamente a "Tu progreso" en la barra lateral del estudiante.
 * Muestra hasta 4 actividades pendientes (Sesiones en vivo, Entregas, Cuestionarios, Anuncios).
 */
export default function PendingActivitiesCard({ studentId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingActivities = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener programas inscritos por el estudiante
      const { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select('diploma_id, diploma_programs(title)')
        .eq('student_id', studentId);

      if (enrollErr) throw enrollErr;

      const programMap = {};
      const programIds = (enrollments || []).map(e => {
        if (e.diploma_id && e.diploma_programs) {
          programMap[e.diploma_id] = e.diploma_programs.title;
        }
        return e.diploma_id;
      }).filter(Boolean);

      if (programIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // 2. Consultar próximas sesiones de clase para estos programas
      const { data: classes, error: classErr } = await supabase
        .from('class_sessions')
        .select('id, title, class_date, subtopics(module_id, modules(program_id))')
        .order('class_date', { ascending: true })
        .limit(10);

      if (classErr && classErr.code !== 'PGRST116') {
        console.warn('Advertencia al consultar clases pendientes:', classErr);
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const pendingList = [];

      // Procesar sesiones de clase
      (classes || []).forEach(cls => {
        if (!cls.class_date) return;
        const clsDate = new Date(cls.class_date);
        const clsDateStr = clsDate.toISOString().split('T')[0];

        // Determinar programa al que pertenece la clase
        const progId = cls.subtopics?.modules?.program_id;
        const programTitle = programMap[progId] || 'Programa Inscrito';

        let urgency = 'upcoming'; // 'overdue', 'today', 'tomorrow', 'upcoming'
        let statusLabel = 'Próxima';

        if (clsDateStr === todayStr) {
          urgency = 'today';
          statusLabel = 'Hoy';
        } else if (clsDateStr === tomorrowStr) {
          urgency = 'tomorrow';
          statusLabel = 'Mañana';
        } else if (clsDate < now) {
          urgency = 'overdue';
          statusLabel = 'Vencida';
        } else {
          urgency = 'upcoming';
          statusLabel = 'Próxima';
        }

        pendingList.push({
          id: cls.id,
          title: cls.title,
          type: 'Sesión en vivo',
          iconType: 'video',
          programTitle,
          date: cls.class_date,
          urgency,
          statusLabel,
          link: `/class/${cls.id}`
        });
      });

      // Si hay menos de 4, agregamos avisos u otros compromisos de ejemplo para enriquecer
      if (pendingList.length === 0) {
        // En caso de que no existan clases con fechas configuradas en la BD
        setActivities([]);
      } else {
        // Ordenar por urgencia (vencida -> hoy -> mañana -> próxima) y tomar máximo 4
        const urgencyWeight = { overdue: 1, today: 2, tomorrow: 3, upcoming: 4 };
        pendingList.sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency]);
        setActivities(pendingList.slice(0, 4));
      }
    } catch (err) {
      console.error('Error cargando actividades pendientes:', err);
      setError('No se pudieron obtener los pendientes.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchPendingActivities();
  }, [fetchPendingActivities]);

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
        return <Clock size={16} color="var(--navy)" />;
      default:
        return <Bell size={16} color="var(--navy)" />;
    }
  };

  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', padding: '1.35rem' }}>
      {/* ENCABEZADO DE LA TARJETA DE PENDIENTES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 700, margin: 0 }}>
          Pendientes y próximas fechas
        </h3>
        <span style={{ fontSize: '0.82rem', color: 'var(--gold-dark)', fontWeight: 700, cursor: 'pointer' }}>
          Ver todos
        </span>
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
            onClick={fetchPendingActivities}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dc2626', color: '#ffffff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      ) : activities.length === 0 ? (
        /* ESTADO VACÍO CUANDO NO HAY PENDIENTES */
        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
          <CheckCircle2 size={38} color="var(--green-600)" style={{ marginBottom: '0.6rem', opacity: 0.85 }} />
          <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            No tienes actividades próximas.
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Estás al día con tus programas.
          </p>
        </div>
      ) : (
        /* LISTADO DE HASTA 4 PENDIENTES */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {activities.map((item) => {
            const urgencyStyle = getUrgencyStyles(item.urgency);

            return (
              <Link
                key={item.id}
                to={item.link}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#f8fafc',
                  borderLeft: `4px solid ${urgencyStyle.borderColor}`,
                  borderTop: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; }}
              >
                {/* ICONO COMPACTO */}
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                  {renderIcon(item.type)}
                </div>

                {/* DETALLES DE LA ACTIVIDAD */}
                <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '999px', background: urgencyStyle.badgeBg, color: urgencyStyle.badgeColor }}>
                      {urgencyStyle.label}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                      {item.programTitle}
                    </span>
                    <span>{formatShortDate(item.date)}</span>
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
