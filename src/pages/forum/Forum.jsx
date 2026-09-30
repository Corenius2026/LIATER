/**
 * Forum.jsx — Página principal del foro del programa.
 * Categorías: Dudas Académicas / Debate.
 * FIX: currentUser.id ya ES users_profile.id (ver AuthContext.jsx L24).
 *      Se eliminó la query redundante que causaba "Debes iniciar sesión".
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquarePlus, Filter, RefreshCw, MessagesSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ForumThreadCard from '../../components/forum/ForumThreadCard';
import ForumNewThreadModal from '../../components/forum/ForumNewThreadModal';

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal]           = useState(false);
  const [readMap, setReadMap]               = useState({});
  const [programTitle, setProgramTitle]     = useState('');

  // currentUser.id YA ES users_profile.id (definido en AuthContext.jsx L24)
  const userProfileId = currentUser?.id ?? null;

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

  // Cargar estado de lectura (no-leído badge)
  const fetchReadStatus = useCallback(async (uid) => {
    if (!uid) return;
    const { data } = await supabase
      .from('forum_read_status')
      .select('thread_id, last_read_at')
      .eq('user_id', uid);
    if (data) {
      const map = {};
      data.forEach(r => { map[r.thread_id] = r.last_read_at; });
      setReadMap(map);
    }
  }, []);

  // Cargar hilos del foro
  const fetchThreads = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('forum_threads')
        .select(`
          id, title, body, category,
          is_pinned, is_locked, is_resolved,
          views_count, created_at, updated_at,
          author:author_id ( id, full_name, role ),
          class_session:class_id ( id, title )
        `)
        .eq('program_id', programId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      // Contar replies por hilo
      const threadIds = (data || []).map(t => t.id);
      let countMap = {};
      if (threadIds.length > 0) {
        const { data: postCounts } = await supabase
          .from('forum_posts')
          .select('thread_id')
          .in('thread_id', threadIds)
          .eq('is_deleted', false);
        (postCounts || []).forEach(p => {
          countMap[p.thread_id] = (countMap[p.thread_id] || 0) + 1;
        });
      }

      setThreads((data || []).map(t => ({ ...t, reply_count: countMap[t.id] || 0 })));
    } catch (err) {
      console.error('Error cargando hilos del foro:', err);
      setError('No se pudieron cargar los hilos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [programId, categoryFilter]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);
  useEffect(() => { if (userProfileId) fetchReadStatus(userProfileId); }, [userProfileId, fetchReadStatus]);

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

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Encabezado */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy, #0b1528)' }}>
            💬 Foro — {programTitle || 'Programa'}
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            Espacio de discusión del programa. Resuelve dudas académicas y participa en debates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={fetchThreads}
            title="Actualizar"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.55rem 0.85rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
              border: '1.5px solid var(--border-color, #e2e8f0)', background: 'transparent',
              color: 'var(--text-muted, #64748b)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
              background: 'var(--navy, #0b1528)', color: 'white', border: 'none', cursor: 'pointer',
            }}
          >
            <MessageSquarePlus size={16} />
            Nuevo hilo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <Filter size={14} style={{ color: 'var(--text-muted, #94a3b8)', alignSelf: 'center', flexShrink: 0 }} />
        {CATEGORY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setCategoryFilter(opt.value)}
            style={{
              padding: '0.3rem 0.85rem', borderRadius: '999px', fontWeight: 600, fontSize: '0.78rem',
              border: `1.5px solid ${categoryFilter === opt.value ? 'var(--navy, #0b1528)' : 'var(--border-color, #e2e8f0)'}`,
              background: categoryFilter === opt.value ? 'var(--navy, #0b1528)' : 'transparent',
              color: categoryFilter === opt.value ? 'white' : 'var(--text-muted, #64748b)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted, #94a3b8)' }}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid rgba(0,0,0,0.1)',
            borderTopColor: 'var(--gold-dark, #cca352)', borderRadius: '50%',
            animation: 'liaterSpin 0.75s linear infinite', margin: '0 auto 0.75rem',
          }} />
          <style>{`@keyframes liaterSpin { to { transform: rotate(360deg); } }`}</style>
          Cargando hilos...
        </div>
      ) : error ? (
        <div style={{
          padding: '1.25rem', borderRadius: '10px', textAlign: 'center',
          background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)',
          color: '#dc2626', fontSize: '0.88rem',
        }}>
          {error}
          <button onClick={fetchThreads} style={{ marginLeft: '1rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', color: '#dc2626', textDecoration: 'underline' }}>
            Reintentar
          </button>
        </div>
      ) : threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted, #94a3b8)' }}>
          <MessagesSquare size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>Aún no hay hilos en este foro</p>
          <p style={{ margin: '0.35rem 0 1.25rem', fontSize: '0.82rem' }}>¡Sé el primero en abrir una discusión!</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
              background: 'var(--navy, #0b1528)', color: 'white', border: 'none', cursor: 'pointer',
            }}
          >
            <MessageSquarePlus size={15} /> Crear primer hilo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {threads.map(thread => (
            <ForumThreadCard key={thread.id} thread={thread} isUnread={isUnread(thread)} />
          ))}
        </div>
      )}

      <ForumNewThreadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        programId={programId}
        userProfileId={userProfileId}
        onCreated={handleThreadCreated}
      />
    </div>
  );
}
