import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  Paperclip, FileText, Presentation, ExternalLink, Code, Download,
  Eye, Search, Filter, BookOpen, Video, ArrowLeft, ArrowRight,
  Layers, Calendar, Clock, ChevronRight, X, Check, Copy,
  Sparkles, Home, BarChart2, Users, ListTree, FolderDown
} from 'lucide-react';

/* ── HELPER: Formatear URL para embeber documentos de Google Drive ── */
function formatEmbedDocUrl(url) {
  if (!url) return '';
  let trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    if (trimmed.includes('/preview')) return trimmed;
    return trimmed.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  }
  return trimmed;
}

/* ── HELPER: Ícono por tipo de recurso ── */
function getResourceIcon(type, size = 18) {
  switch (type) {
    case 'presentation':
      return <Presentation size={size} color="var(--gold-dark, #b45309)" />;
    case 'file':
      return <FileText size={size} color="#2563eb" />;
    case 'link':
      return <ExternalLink size={size} color="#16a34a" />;
    case 'code':
      return <Code size={size} color="#9333ea" />;
    default:
      return <Paperclip size={size} color="var(--navy, #14213D)" />;
  }
}

/* ── HELPER: Etiqueta legible por tipo ── */
function getResourceTypeLabel(type) {
  switch (type) {
    case 'presentation': return 'Presentación / Diapositivas';
    case 'file': return 'Documento / Lectura';
    case 'link': return 'Enlace de Interés';
    case 'code': return 'Código / Repositorio';
    default: return 'Material de Estudio';
  }
}

export default function CourseResources() {
  const { programId } = useParams();
  const { currentUser } = useAuth();

  const cleanProgramId = programId ? decodeURIComponent(programId).replace(/\s+/g, '-').trim() : '';

  const [loading, setLoading] = useState(true);
  const [programTitle, setProgramTitle] = useState('Programa Académico');
  const [programType, setProgramType] = useState('diplomado');
  const [resources, setResources] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'presentation' | 'file' | 'link' | 'code'
  const [classFilter, setClassFilter] = useState('all'); // 'all' | classId
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    async function fetchCourseResources() {
      if (!cleanProgramId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Obtener información del programa
        const { data: progData } = await supabase
          .from('diploma_programs')
          .select('id, title, program_type')
          .eq('id', cleanProgramId)
          .maybeSingle();

        if (progData) {
          setProgramTitle(progData.title || 'Programa Académico');
          setProgramType(progData.program_type || 'diplomado');
          localStorage.setItem('activeProgramId', cleanProgramId);
          if (progData.program_type) {
            localStorage.setItem('activeProgramType', progData.program_type);
          }
          window.dispatchEvent(new Event('programContextChanged'));
        }

        // 2. Obtener todas las clases del programa con sus sesiones y módulos
        const { data: classesData, error: classesErr } = await supabase
          .from('class_sessions')
          .select(`
            id,
            title,
            class_date,
            session_id,
            subtopic_id,
            sessions (
              id,
              title,
              order_index,
              modules (
                id,
                title,
                order_index
              )
            ),
            subtopics (
              id,
              title,
              order_index,
              modules (
                id,
                title,
                order_index
              )
            )
          `)
          .eq('program_id', cleanProgramId)
          .order('class_date', { ascending: true });

        if (classesErr) throw classesErr;

        const classMap = {};
        const availableClasses = [];

        (classesData || []).forEach(cls => {
          const sesObj = cls.sessions || cls.subtopics;
          const modObj = sesObj?.modules;

          classMap[cls.id] = {
            id: cls.id,
            title: cls.title || 'Clase sin título',
            class_date: cls.class_date,
            sessionTitle: sesObj?.title || null,
            moduleTitle: modObj?.title || null,
          };

          availableClasses.push({
            id: cls.id,
            title: cls.title || 'Clase sin título',
            date: cls.class_date,
            sessionTitle: sesObj?.title || null
          });
        });

        setClassesList(availableClasses);

        // 3. Obtener recursos vinculados a las clases de este programa
        const classIds = Object.keys(classMap);
        if (classIds.length > 0) {
          const { data: resData, error: resErr } = await supabase
            .from('resources')
            .select('*')
            .in('class_id', classIds)
            .neq('is_visible', false)
            .order('created_at', { ascending: true });

          if (resErr) throw resErr;

          // Enriquecer cada recurso con los datos de su clase asociada
          const enriched = (resData || []).map(r => {
            const cls = classMap[r.class_id] || {};
            return {
              ...r,
              classId: r.class_id,
              classTitle: cls.title || 'Clase General',
              classDate: cls.class_date,
              sessionTitle: cls.sessionTitle,
              moduleTitle: cls.moduleTitle,
            };
          });

          setResources(enriched);
        } else {
          setResources([]);
        }

      } catch (err) {
        console.error('Error fetching course resources:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourseResources();
  }, [cleanProgramId]);

  // Contadores por tipo de recurso
  const counts = useMemo(() => {
    return {
      all: resources.length,
      presentation: resources.filter(r => (r.resource_type || r.type) === 'presentation').length,
      file: resources.filter(r => (r.resource_type || r.type) === 'file').length,
      link: resources.filter(r => (r.resource_type || r.type) === 'link').length,
      code: resources.filter(r => (r.resource_type || r.type) === 'code').length,
    };
  }, [resources]);

  // Filtrado de recursos
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // Filtro por tipo
      if (typeFilter !== 'all') {
        const actualType = res.resource_type || res.type;
        if (actualType !== typeFilter) return false;
      }

      // Filtro por clase específica
      if (classFilter !== 'all') {
        if (String(res.classId) !== String(classFilter)) return false;
      }

      // Filtro por texto de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (res.title || '').toLowerCase().includes(query);
        const descMatch = (res.description || '').toLowerCase().includes(query);
        const classMatch = (res.classTitle || '').toLowerCase().includes(query);
        const sessionMatch = (res.sessionTitle || '').toLowerCase().includes(query);
        const moduleMatch = (res.moduleTitle || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !classMatch && !sessionMatch && !moduleMatch) {
          return false;
        }
      }

      return true;
    });
  }, [resources, typeFilter, classFilter, searchQuery]);

  const handleCopyLink = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isCourse = programType === 'curso' || programType === 'course';

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '1.5rem 0', animation: 'fadeSlideUp 0.35s ease-out' }}>
        <div className="skeleton" style={{ width: '220px', height: '36px', marginBottom: '1rem', borderRadius: '8px' }} />
        <div className="skeleton" style={{ width: '380px', height: '24px', marginBottom: '2rem', borderRadius: '6px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '170px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>

      {/* ── BREADCRUMB DE RETORNO ── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to={`/dashboard/${cleanProgramId}`} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
            <ArrowLeft size={14} /> Volver al Inicio
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            <ChevronRight size={14} />
            <Link
              to={`/dashboard/${cleanProgramId}`}
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--navy)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              {programTitle}
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>
              Recursos de Estudio
            </span>
          </div>
        </div>

        {/* ACCESO RÁPIDO A MÓDULOS / SESIONES */}
        <Link
          to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`}
          className="btn btn-outline"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <BookOpen size={14} /> {isCourse ? 'Ver Sesiones' : 'Ver Módulos'}
        </Link>
      </div>

      {/* ── ENCABEZADO PRINCIPAL ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className={`badge ${isCourse ? 'badge-gold' : 'badge-primary'}`} style={{ fontSize: '0.74rem', padding: '0.2rem 0.6rem' }}>
            {isCourse ? 'Curso Corto' : 'Diplomado'}
          </span>
          <span style={{
            background: 'rgba(252, 163, 17, 0.15)',
            color: 'var(--gold-dark, #b45309)',
            fontSize: '0.74rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '999px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <Paperclip size={12} /> {resources.length} {resources.length === 1 ? 'material subido' : 'materiales subidos'}
          </span>
        </div>

        <h1 className="page-title" style={{ fontSize: '1.85rem', lineHeight: 1.25, margin: 0 }}>
          Recursos y Materiales de Estudio
        </h1>
        <p className="page-description" style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Explora todos los documentos, presentaciones, lecturas y enlaces del curso con la especificación exacta de la clase a la que pertenecen.
        </p>
      </div>

      {/* ── BARRA DE PESTAÑAS DEL CURSO (NAVEGACIÓN INTEGRADA) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.75rem',
        overflowX: 'auto',
        paddingBottom: '4px',
        borderBottom: '1px solid var(--border-color)',
        scrollbarWidth: 'none'
      }}>
        <Link
          to={`/dashboard/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <Home size={15} /> Resumen
        </Link>
        <Link
          to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          {isCourse ? <ListTree size={15} /> : <BookOpen size={15} />}
          {isCourse ? 'Sesiones' : 'Módulos'}
        </Link>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 700,
            background: 'var(--navy, #14213D)',
            color: '#FFFFFF',
            borderBottom: '3px solid var(--gold, #FCA311)',
            whiteSpace: 'nowrap'
          }}
        >
          <Paperclip size={15} color="var(--gold, #FCA311)" /> Recursos y Materiales ({resources.length})
        </div>
        <Link
          to={`/resultados/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <BarChart2 size={15} /> Mis Resultados
        </Link>
        <Link
          to={`/teachers/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <Users size={15} /> Profesores
        </Link>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '1.25rem',
        border: '1px solid #E2E8F0',
        marginBottom: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(20,33,61,0.03)'
      }}>
        {/* FILA SUPERIOR: BUSCADOR + SELECTOR DE CLASE */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Buscador de texto */}
          <div style={{
            position: 'relative',
            flex: '1 1 280px',
            minWidth: '240px'
          }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por material, tema o clase..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.86rem',
                outline: 'none',
                background: '#FAFBFD',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--gold, #FCA311)'}
              onBlur={e => e.currentTarget.style.borderColor = '#CBD5E1'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Selector de Clase */}
          <div style={{ flex: '0 1 300px', minWidth: '220px' }}>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem',
                background: '#FAFBFD',
                color: 'var(--navy, #14213D)',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todas las Clases ({classesList.length})</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.sessionTitle ? `(${c.sessionTitle})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FILA INFERIOR: FILTROS TIPO PILL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Todos', count: counts.all },
              { id: 'presentation', label: 'Presentaciones', count: counts.presentation },
              { id: 'file', label: 'Lecturas / PDF', count: counts.file },
              { id: 'link', label: 'Enlaces', count: counts.link },
              { id: 'code', label: 'Código / Repos', count: counts.code },
            ].map(f => {
              const isSelected = typeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id)}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? 'var(--navy, #14213D)' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : 'var(--navy, #14213D)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: isSelected ? 'rgba(252,163,17,0.35)' : '#E2E8F0',
                    color: isSelected ? 'var(--gold, #FCA311)' : '#64748B',
                    fontWeight: 700
                  }}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            Mostrando <strong>{filteredResources.length}</strong> de {resources.length} recursos
          </span>
        </div>
      </div>

      {/* ── LISTADO PRINCIPAL DE RECURSOS CON ESPECIFICACIÓN DE CLASE ── */}
      {filteredResources.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed #CBD5E1',
          boxShadow: '0 1px 3px rgba(20,33,61,0.02)'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: '#F1F5F9', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1rem', color: '#94A3B8'
          }}>
            <Paperclip size={26} />
          </div>
          <h3 style={{ color: 'var(--navy, #14213D)', margin: '0 0 0.4rem 0', fontWeight: 700, fontSize: '1.15rem' }}>
            {resources.length === 0 ? 'No hay recursos cargados aún' : 'No se encontraron recursos con los filtros aplicados'}
          </h3>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.88rem', margin: 0, maxWidth: '460px', marginInline: 'auto' }}>
            {resources.length === 0
              ? 'Los profesores y administradores publicarán las diapositivas, documentos y guías de estudio a medida que avance el curso.'
              : 'Prueba buscando con otro término o seleccionando otra categoría o clase en los filtros superiores.'
            }
          </p>
          {(searchQuery || typeFilter !== 'all' || classFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setTypeFilter('all'); setClassFilter('all'); }}
              className="btn btn-outline"
              style={{ marginTop: '1.25rem', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '1.25rem' }}>
          {filteredResources.map(res => {
            const isDrive = res.url?.includes('drive.google.com') || res.provider === 'drive';
            const resType = res.resource_type || res.type || 'file';

            return (
              <div
                key={res.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  boxShadow: '0 2px 6px rgba(20,33,61,0.03)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 18px rgba(20,33,61,0.08)';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(20,33,61,0.03)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <div>
                  {/* ENCABEZADO DE TARJETA: ESPECIFICACIÓN DE LA CLASE DESTACADA */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.85rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    {/* BADGE DE CLASE ESPECÍFICA */}
                    <Link
                      to={`/class/${res.classId}`}
                      title={`Ir a la página de la clase: ${res.classTitle}`}
                      style={{
                        background: 'linear-gradient(135deg, rgba(20,33,61,0.07) 0%, rgba(20,33,61,0.03) 100%)',
                        color: 'var(--navy, #14213D)',
                        borderRadius: '8px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: '1px solid rgba(20,33,61,0.12)',
                        transition: 'all 0.15s ease',
                        maxWidth: '100%'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = 'var(--navy, #14213D)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20,33,61,0.07) 0%, rgba(20,33,61,0.03) 100%)';
                        e.currentTarget.style.color = 'var(--navy, #14213D)';
                      }}
                    >
                      <Video size={13} color="var(--gold, #FCA311)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Clase: {res.classTitle}
                      </span>
                    </Link>

                    {/* TIPO DE RECURSO BADGE */}
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      background: resType === 'presentation' ? 'rgba(252,163,17,0.18)' : resType === 'file' ? '#EFF6FF' : resType === 'link' ? '#F0FDF4' : '#FAF5FF',
                      color: resType === 'presentation' ? '#B45309' : resType === 'file' ? '#1D4ED8' : resType === 'link' ? '#15803D' : '#7E22CE',
                      border: `1px solid ${resType === 'presentation' ? 'rgba(252,163,17,0.3)' : resType === 'file' ? '#BFDBFE' : resType === 'link' ? '#BBF7D0' : '#E9D5FF'}`
                    }}>
                      {resType}
                    </span>
                  </div>

                  {/* CUERPO: TÍTULO Y DESCRIPCIÓN DEL RECURSO */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      background: '#F8FAFC', border: '1px solid #E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px'
                    }}>
                      {getResourceIcon(resType, 20)}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{
                        fontSize: '0.98rem',
                        fontWeight: 700,
                        color: 'var(--navy, #14213D)',
                        margin: '0 0 0.35rem 0',
                        lineHeight: 1.35
                      }}>
                        {res.title}
                      </h3>

                      {res.description && (
                        <p style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-muted, #64748B)',
                          margin: '0 0 0.5rem 0',
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {res.description}
                        </p>
                      )}

                      {/* DETALLES DE SESIÓN / FECHA */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.74rem', color: '#64748B', marginTop: '0.35rem' }}>
                        {res.sessionTitle && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Layers size={11} color="#94A3B8" /> {res.sessionTitle}
                          </span>
                        )}
                        {res.classDate && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={11} color="#94A3B8" /> {new Date(res.classDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {isDrive && (
                          <span style={{
                            fontSize: '0.7rem', color: '#0369A1', background: '#F0F9FF',
                            padding: '1px 6px', borderRadius: '4px', fontWeight: 600
                          }}>
                            Google Drive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN DE LA TARJETA */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid #F1F5F9',
                  flexWrap: 'wrap'
                }}>
                  {/* Botón Principal: Abrir Recurso */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isDrive) {
                        setSelectedDoc(res);
                      } else {
                        window.open(res.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    style={{
                      flex: '1 1 auto',
                      background: 'var(--navy, #14213D)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#000000'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--navy, #14213D)'}
                  >
                    <Eye size={14} color="var(--gold, #FCA311)" />
                    <span>{isDrive ? 'Abrir Material' : 'Abrir Enlace'}</span>
                  </button>

                  {/* Botón Secundario: Ir a la Clase de este recurso */}
                  <Link
                    to={`/class/${res.classId}`}
                    title="Ver clase completa con video y actividades"
                    style={{
                      background: '#F8FAFC',
                      color: 'var(--navy, #14213D)',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#F1F5F9';
                      e.currentTarget.style.borderColor = '#94A3B8';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                  >
                    <span>Ir a Clase</span>
                    <ArrowRight size={13} />
                  </Link>

                  {/* Botón Auxiliar: Copiar URL */}
                  {res.url && (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(res.url, res.id)}
                      title="Copiar enlace del recurso"
                      style={{
                        background: '#FFFFFF',
                        color: copiedId === res.id ? '#16A34A' : '#64748B',
                        border: `1px solid ${copiedId === res.id ? '#86EFAC' : '#E2E8F0'}`,
                        borderRadius: '8px',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedId === res.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL VISOR DE DOCUMENTOS (GOOGLE DRIVE / PRESENTACIÓN) ── */}
      {selectedDoc && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1050px',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            animation: 'fadeSlideUp 0.25s ease-out'
          }}>
            {/* Header del Visor */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              background: '#FAFBFD'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div style={{
                  padding: '6px', borderRadius: '8px',
                  background: 'rgba(252, 163, 17, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {getResourceIcon(selectedDoc.resource_type || selectedDoc.type, 18)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{
                    margin: 0, fontSize: '0.98rem', fontWeight: 800,
                    color: 'var(--navy, #14213D)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {selectedDoc.title}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                    Clase: <strong>{selectedDoc.classTitle}</strong>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {selectedDoc.url && (
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ExternalLink size={13} /> Abrir en pestaña nueva
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
                  onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Iframe Seguro para Documento */}
            <div style={{ flex: 1, position: 'relative', background: '#0F172A' }}>
              <iframe
                src={formatEmbedDocUrl(selectedDoc.url)}
                title={selectedDoc.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
