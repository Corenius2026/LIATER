import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { PlayCircle, BookOpen, Calendar, Video, Clock, User, Megaphone, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const { programId } = useParams();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    diplomaTitle: 'Programa Académico',
    programType: 'diplomado',
    modulesCount: 0,
    upcomingClasses: [],
    latestRecordings: [],
    firstModuleId: null,
    announcements: []
  });

  const cleanProgramId = programId ? decodeURIComponent(programId).replace(/\s+/g, '-').trim() : '';

  useEffect(() => {
    async function fetchDashboardData() {
      if (!cleanProgramId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // 1. Obtener Diplomado / Curso activo
        const { data: diplomaData } = await supabase
          .from('diploma_programs')
          .select('title, program_type')
          .eq('id', cleanProgramId)
          .maybeSingle();

        // 2. Obtener conteo de módulos y el ID del primer módulo
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id')
          .eq('program_id', cleanProgramId)
          .order('order_index', { ascending: true });

        // 3. Obtener próximas clases (fecha >= ahora)
        const now = new Date().toISOString();
        const { data: upcomingData } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, duration, video_url')
          .eq('program_id', cleanProgramId)
          .gte('class_date', now)
          .order('class_date', { ascending: true })
          .limit(3);

        // 4. Obtener últimas grabaciones
        const { data: recordingsData } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, video_url')
          .eq('program_id', cleanProgramId)
          .not('video_url', 'is', null)
          .order('class_date', { ascending: false })
          .limit(3);

        // 5. Obtener anuncios
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*, teacher_profiles(name)')
          .eq('program_id', cleanProgramId)
          .order('created_at', { ascending: false })
          .limit(5);

        setDashboardData({
          diplomaTitle: diplomaData?.title || 'Programa Académico',
          programType: diplomaData?.program_type || 'diplomado',
          modulesCount: modulesData?.length || 0,
          upcomingClasses: upcomingData || [],
          latestRecordings: recordingsData || [],
          firstModuleId: modulesData?.[0]?.id || null,
          announcements: announcementsData || []
        });

        // Actualizar contexto global para el Sidebar
        localStorage.setItem('activeProgramId', cleanProgramId);
        if (diplomaData?.program_type) {
          localStorage.setItem('activeProgramType', diplomaData.program_type);
        }
        window.dispatchEvent(new Event('programContextChanged'));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [programId]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Cargando tu panel de estudiante...</h2>
      </div>
    );
  }

  const { diplomaTitle, programType, modulesCount, upcomingClasses, latestRecordings, firstModuleId, announcements } = dashboardData;
  const isCourse = programType === 'curso';

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
      {/* BOTÓN DE RETORNO AL PORTAL */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/portal" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
          <ArrowLeft size={14} /> Volver a Mis Programas
        </Link>
      </div>

      {/* --- ENCABEZADO --- */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Panel de Estudiante</h1>
        <p className="page-description">
          Bienvenido a tu panel de control de <strong>{diplomaTitle}</strong>.
        </p>
      </div>

      {/* --- TARJETAS PRINCIPALES (Resumen) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Tarjeta de Continuar */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, #1e2e52 100%)',
          color: 'white', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-md)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold)', marginBottom: '0.4rem' }}>
            {isCourse ? 'Curso Corto' : 'Diplomado'}
          </span>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: 'white', fontWeight: 800 }}>Tu Progreso</h3>
          <p style={{ marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.85rem', lineHeight: 1.5 }}>
            Explora los módulos y materiales asignados para avanzar en tu aprendizaje.
          </p>
          <div style={{ marginTop: 'auto' }}>
            {firstModuleId ? (
              <Link to={`/module/${firstModuleId}`} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                <PlayCircle size={18} /> {isCourse ? 'Ir al contenido' : 'Ir al primer módulo'}
              </Link>
            ) : (
              <Link to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                <BookOpen size={18} /> {isCourse ? 'Ver Subtemas' : 'Ver Temario'}
              </Link>
            )}
          </div>
        </div>
        
        {/* Tarjeta de Estadísticas */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--navy)', fontWeight: 700 }}>Contenido del Programa</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--gold-dark)', lineHeight: 1 }}>{modulesCount}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '0.35rem', fontWeight: 500 }}>
                {isCourse ? 'Bloques de Contenido' : 'Módulos Registrados'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* --- SECCIÓN DOBLE: PRÓXIMAS CLASES Y GRABACIONES --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* PRÓXIMAS CLASES */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(20,33,61,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="var(--navy)" />
            </div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--navy)' }}>Próximas Clases en Vivo</h2>
          </div>
          
          {upcomingClasses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {upcomingClasses.map(cls => (
                <div key={cls.id} style={{ padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-light)' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.2rem', fontSize: '0.88rem' }}>{cls.title}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {cls.class_date ? new Date(cls.class_date).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha por confirmar'}
                    </p>
                  </div>
                  <Link to={`/class/${cls.id}`} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    Ver detalle
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
              No hay clases programadas próximamente.
            </p>
          )}
        </div>

        {/* ÚLTIMAS GRABACIONES */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--gold-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={18} color="var(--gold-dark)" />
            </div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--navy)' }}>Últimas Grabaciones</h2>
          </div>
          
          {latestRecordings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {latestRecordings.map(cls => (
                <div key={cls.id} style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--surface-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.2rem', fontSize: '0.88rem' }}>{cls.title}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Emitida el {cls.class_date ? new Date(cls.class_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : ''}
                    </p>
                  </div>
                  <Link to={`/class/${cls.id}`} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    <PlayCircle size={14} /> Ver
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
              Aún no hay grabaciones disponibles.
            </p>
          )}
        </div>

      </div>

      {/* --- TABLÓN DE ANUNCIOS --- */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(20,33,61,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={18} color="var(--navy)" />
          </div>
          <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--navy)' }}>Tablón de Anuncios</h2>
        </div>
        
        {announcements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {announcements.map(a => (
              <div key={a.id} style={{
                padding: '1rem 1.25rem',
                borderLeft: `4px solid ${a.tag === 'urgent' ? 'var(--error)' : a.tag === 'info' ? 'var(--green-600)' : 'var(--navy)'}`,
                backgroundColor: 'var(--surface-light)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                border: '1px solid var(--border-color)',
                borderLeftWidth: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <h4 style={{ fontWeight: 700, color: 'var(--navy)', margin: 0, fontSize: '0.92rem' }}>{a.title}</h4>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {a.body}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Publicado por: <strong>{a.teacher_profiles?.name || 'Administración'}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
            No hay anuncios recientes.
          </p>
        )}
      </div>

      {/* --- ACCESOS RÁPIDOS --- */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--navy)' }}>Accesos Rápidos</h2>
      <div className="grid-3">
        <Link to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--gold-subtle)', color: 'var(--gold-dark)', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem' }}>{isCourse ? 'Ver Subtemas' : 'Ver Temario'}</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{isCourse ? 'Explora el contenido del curso' : 'Explora todos los módulos'}</p>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </Link>

        <Link to={`/teachers/${cleanProgramId}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'rgba(20,33,61,0.08)', color: 'var(--navy)', borderRadius: 'var(--radius-md)' }}>
            <User size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem' }}>Cuerpo Docente</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Conoce a tus profesores</p>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </Link>
      </div>

    </div>
  );
}
