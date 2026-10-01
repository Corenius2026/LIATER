/**
 * Forum.jsx — Página principal del foro del programa.
 * Diseño LMS profesional de alta fidelidad:
 * - Encabezado minimalista institucional (UNAL · LIATER)
 * - Botón principal Navy (#14213D) con acento dorado
 * - Buscador en tiempo real integrado con conteo de resultados
 * - Píldoras de filtrado con conteos numéricos dinámicos
 * - Manejo riguroso de roles, estados y eliminación en Supabase
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  MessageSquarePlus, RefreshCw, MessagesSquare,
  AlertCircle, Copy, CheckCircle, Search, X, GraduationCap
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { getProgramThreads, FORUM_SQL_MIGRATION, deleteThreadFromDb } from '@/services/forumService';
import ForumThreadCard from '@/components/forum/ForumThreadCard';
import ForumNewThreadModal from '@/components/forum/ForumNewThreadModal';
import ConfirmModal from '@/components/common/ConfirmModal';

const CATEGORY_OPTIONS = [
  { value: 'all',      label: 'Todos' },
  { value: 'academic', label: 'Dudas Académicas' },
  { value: 'debate',   label: 'Debate' },
];

export default function Forum() {
  const { programId } = useParams();
  const { currentUser } = useAuth();

  const [threads, setThreads]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [tableExists, setTableExists]       = useState(true);
  const [copiedSql, setCopiedSql]           = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [readMap, setReadMap]               = useState({});
  const [programTitle, setProgramTitle]     = useState('');

  const userProfileId = currentUser?.id ?? null;
  const isAdmin = currentUser?.role === 'admin';

  // Estados de eliminación de hilos (Admin)
  const [threadToDelete, setThreadToDelete] = useState(null);
  const [deletingThread, setDeletingThread] = useState(false);
  const [toastFeedback, setToastFeedback]   = useState(null);

  const handleConfirmDeleteThread = async () => {
    if (!threadToDelete?.id) return;
    setDeletingThread(true);
    try {
      await deleteThreadFromDb(threadToDelete.id);
      setThreads(prev => prev.filter(t => t.id !== threadToDelete.id));
      setThreadToDelete(null);
      setToastFeedback('Hilo de discusión eliminado correctamente de la base de datos.');
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err) {
      console.error('Error eliminando hilo:', err);
      alert('Error al eliminar el hilo: ' + (err.message || 'Intenta de nuevo.'));
    } finally {
      setDeletingThread(false);
    }
  };

  // Sincronizar contexto del programa para navegación del menú lateral
  useEffect(() => {
    if (programId) {
      const cleanId = decodeURIComponent(programId).trim();
      localStorage.setItem('activeProgramId', cleanId);
      window.dispatchEvent(new Event('programContextChanged'));
    }
  }, [programId]);

  // Obtener título del programa
  useEffect(() => {
    if (!programId) return;
    supabase
      .from('diploma_programs')
      .select('title')
      .eq('id', programId)
      .single()
      .then(({ data }) => { if (data) setProgramTitle(data.title); });
  }, [programId]);

  // Cargar estado de lectura
  const fetchReadStatus = useCallback(async (uid) => {
    if (!uid || !tableExists) return;
    try {
      const { data } = await supabase
        .from('forum_read_status')
        .select('thread_id, last_read_at')
        .eq('user_id', uid);
      if (data) {
        const map = {};
        data.forEach(r => { map[r.thread_id] = r.last_read_at; });
        setReadMap(map);
      }
    } catch {
      // Ignorar si tabla no existe
    }
  }, [tableExists]);

  // Cargar hilos del foro mediante servicio
  const fetchThreads = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getProgramThreads(programId, categoryFilter);
      if (!res.tableExists) {
        setTableExists(false);
        setThreads([]);
      } else {
        setTableExists(true);
        setThreads(res.data || []);
        if (res.error) {
          setError(res.error);
        }
      }
    } catch (err) {
      console.error('Error cargando hilos del foro:', err);
      setError('No se pudieron cargar los hilos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [programId, categoryFilter]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);
  useEffect(() => { if (userProfileId) fetchReadStatus(userProfileId); }, [userProfileId, fetchReadStatus]);

  const copySql = () => {
    navigator.clipboard.writeText(FORUM_SQL_MIGRATION);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const isUnread = (thread) => {
    const lastRead = readMap[thread.id];
    if (!lastRead) return true;
    return new Date(thread.updated_at) > new Date(lastRead);
  };

  const handleThreadCreated = (newThread) => {
    setThreads(prev => [{
      ...newThread,
      reply_count: 0,
      author: { full_name: currentUser?.full_name || 'Tú', role: currentUser?.role },
    }, ...prev]);
  };

  // Filtrado reactivo en vivo por texto de búsqueda
  const visibleThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.body && t.body.toLowerCase().includes(q)) ||
      (t.author?.full_name && t.author.full_name.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  // Conteos para píldoras
  const counts = useMemo(() => {
    return {
      all: threads.length,
      academic: threads.filter(t => t.category === 'academic').length,
      debate: threads.filter(t => t.category === 'debate').length,
    };
  }, [threads]);

  return (
    <div style={{ width: '100%', animation: 'fadeSlideUp 0.35s ease-out' }}>

      {/* ── ENCABEZADO MINIMALISTA INSTITUCIONAL ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.4rem 1.75rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(11, 21, 40, 0.03)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}>
          {/* Título y Contexto Académico */}
          <div style={{ maxWidth: '680px' }}>
            <h1 style={{
              margin: '0 0 0.35rem 0',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--navy, #14213D)',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
            }}>
              Foro de Discusión y Consultas
            </h1>

            <p style={{
              margin: 0,
              fontSize: '0.86rem',
              color: '#64748B',
              lineHeight: 1.5,
            }}>
              Espacio oficial para resolver consultas académicas, compartir recursos y participar en debates de cátedra.
            </p>
          </div>

          {/* Acciones Superiores: Refrescar + Botón Nuevo Hilo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={fetchThreads}
              title="Actualizar lista de discusiones"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '9px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
                e.currentTarget.style.color = 'var(--navy, #0b1528)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <RefreshCw size={15} />
            </button>

            {/* Botón Principal: Navy con detalle Dorado */}
            <button
              onClick={() => setShowModal(true)}
              disabled={!tableExists}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.62rem 1.25rem',
                borderRadius: '9px',
                fontWeight: 700,
                fontSize: '0.86rem',
                background: tableExists ? 'var(--navy, #0b1528)' : '#94a3b8',
                color: '#ffffff',
                border: '1.5px solid rgba(252, 163, 17, 0.45)',
                boxShadow: '0 2px 8px rgba(11, 21, 40, 0.15)',
                cursor: tableExists ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseOver={e => {
                if (tableExists) {
                  e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(252, 163, 17, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={e => {
                if (tableExists) {
                  e.currentTarget.style.borderColor = 'rgba(252, 163, 17, 0.45)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(11, 21, 40, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <MessageSquarePlus size={16} color="var(--gold, #cca352)" />
              <span>Nuevo hilo</span>
            </button>
          </div>
        </div>

        {/* ── BARRA INTEGRADA: BUSCADOR + PÍLDORAS DE FILTRO ── */}
        {tableExists && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            marginTop: '1.25rem',
            paddingTop: '1.15rem',
            borderTop: '1px solid #f1f5f9',
          }}>
            {/* Buscador reactivo */}
            <div style={{
              position: 'relative',
              flex: '1 1 280px',
              maxWidth: '380px',
            }}>
              <Search
                size={15}
                color="#94a3b8"
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar preguntas o temas..."
                style={{
                  width: '100%',
                  padding: '0.48rem 2.2rem 0.48rem 2.3rem',
                  fontSize: '0.83rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: 'var(--navy, #0b1528)',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--gold, #cca352)';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(252, 163, 17, 0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.background = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '0.2rem',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Píldoras de Categoría con Contadores */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              {CATEGORY_OPTIONS.map(opt => {
                const isActive = categoryFilter === opt.value;
                const count = counts[opt.value] ?? 0;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategoryFilter(opt.value)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.42rem 0.95rem',
                      borderRadius: '999px',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8rem',
                      border: `1px solid ${isActive ? 'var(--navy, #0b1528)' : '#e2e8f0'}`,
                      background: isActive ? 'var(--navy, #0b1528)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 1px 3px rgba(11, 21, 40, 0.15)' : 'none',
                    }}
                    onMouseOver={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
                        e.currentTarget.style.color = 'var(--navy, #0b1528)';
                      }
                    }}
                    onMouseOut={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#475569';
                      }
                    }}
                  >
                    <span>{opt.label}</span>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
                      color: isActive ? 'var(--gold, #cca352)' : '#64748b',
                      fontWeight: 700,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── BANNER GUÍA SI LAS TABLAS ESTÁN PENDIENTES DE MIGRACIÓN ── */}
      {!tableExists && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#92400e', fontSize: '1rem', fontWeight: 800 }}>
                Tablas del Foro pendientes de migración en Supabase
              </h3>
              <p style={{ margin: '0 0 0.85rem 0', color: '#b45309', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Para habilitar las discusiones, respuestas y reacciones en el LMS, ejecuta el script en el <strong>SQL Editor</strong> de tu proyecto Supabase:
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={copySql}
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#d97706',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {copiedSql ? <CheckCircle size={15} /> : <Copy size={15} />}
                  <span>{copiedSql ? '¡SQL Copiado!' : 'Copiar Script SQL de Migración'}</span>
                </button>
                <button
                  type="button"
                  onClick={fetchThreads}
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    border: '1.5px solid #d97706',
                    background: 'transparent',
                    color: '#92400e',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Verificar nuevamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTADO DE HILOS / ESTADOS ── */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 0',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            border: '3px solid #e2e8f0',
            borderTopColor: 'var(--gold, #cca352)',
            borderRadius: '50%',
            animation: 'liaterSpin 0.75s linear infinite',
            margin: '0 auto 0.85rem',
          }} />
          <style>{`@keyframes liaterSpin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>
            Cargando discusiones académicas...
          </span>
        </div>
      ) : error && tableExists ? (
        <div style={{
          padding: '1.5rem',
          borderRadius: '12px',
          textAlign: 'center',
          background: 'rgba(220, 38, 38, 0.04)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
          color: '#dc2626',
          fontSize: '0.88rem',
        }}>
          <span>{error}</span>
          <button
            onClick={fetchThreads}
            style={{
              marginLeft: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: '#dc2626',
              textDecoration: 'underline',
            }}
          >
            Reintentar
          </button>
        </div>
      ) : tableExists && visibleThreads.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(11, 21, 40, 0.02)',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(20, 33, 61, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <MessagesSquare size={26} color="var(--navy, #0b1528)" />
          </div>
          <h3 style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--navy, #0b1528)' }}>
            {searchQuery ? 'No se encontraron resultados' : 'Aún no hay hilos en este foro'}
          </h3>
          <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            {searchQuery
              ? `No hay coincidencias para "${searchQuery}". Intenta con otros términos o limpia la búsqueda.`
              : 'Sé el primero en abrir una discusión técnica o resolver una duda con la cátedra.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.82rem',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              Limpiar búsqueda
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.62rem 1.35rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: 'var(--navy, #0b1528)',
                color: '#ffffff',
                border: '1px solid rgba(252, 163, 17, 0.4)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(11, 21, 40, 0.15)',
              }}
            >
              <MessageSquarePlus size={15} color="var(--gold, #cca352)" />
              <span>Crear primer hilo</span>
            </button>
          )}
        </div>
      ) : tableExists ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visibleThreads.map(thread => (
            <ForumThreadCard
              key={thread.id}
              thread={thread}
              isUnread={isUnread(thread)}
              canDelete={isAdmin}
              onDelete={(t) => setThreadToDelete(t)}
            />
          ))}
        </div>
      ) : null}

      <ForumNewThreadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        programId={programId}
        userProfileId={userProfileId}
        onCreated={handleThreadCreated}
      />

      {/* Modal de confirmación para eliminar hilo (Admin) */}
      <ConfirmModal
        isOpen={Boolean(threadToDelete)}
        onClose={() => !deletingThread && setThreadToDelete(null)}
        onConfirm={handleConfirmDeleteThread}
        title="Eliminar hilo de discusión"
        message={
          threadToDelete?.title
            ? `¿Estás seguro de que deseas eliminar permanentemente el hilo "${threadToDelete.title}"?`
            : '¿Estás seguro de que deseas eliminar este hilo de discusión?'
        }
        note="Esta acción borrará de forma irreversible el hilo junto con todas sus respuestas y reacciones de la base de datos."
        confirmText="Eliminar hilo definitivamente"
        cancelText="Cancelar"
        isDanger={true}
        loading={deletingThread}
      />

      {/* Notificación toast elegante en paleta LIATER (Navy + Dorado) */}
      {toastFeedback && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'var(--navy, #0b1528)',
          color: '#ffffff',
          padding: '0.85rem 1.45rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(11, 21, 40, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          zIndex: 9999,
          border: '1.5px solid rgba(204, 163, 82, 0.4)',
          animation: 'fadeSlideUp 0.25s ease-out',
        }}>
          <CheckCircle size={17} color="var(--gold, #cca352)" />
          <span>{toastFeedback}</span>
        </div>
      )}
    </div>
  );
}
