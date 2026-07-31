import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { PlayCircle, BookOpen, Calendar, Video, Clock, User, Megaphone } from 'lucide-react';

export default function Dashboard() {
  const { programId } = useParams();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    diplomaTitle: 'Diplomado',
    modulesCount: 0,
    classesCount: 0,
    upcomingClasses: [],
    latestRecordings: [],
    latestRecordings: [],
    firstModuleId: null,
    announcements: []
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!programId) return;
      try {
        // 1. Obtener Diplomado activo
        const { data: diplomaData } = await supabase
          .from('diploma_programs')
          .select('title, program_type')
          .eq('id', programId)
          .maybeSingle();

        // 2. Obtener conteo de mÃ³dulos y el ID del primer mÃ³dulo
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id')
          .eq('program_id', programId)
          .order('order_index', { ascending: true });

        // 3. Obtener prÃ³ximas clases (fecha > ahora)
        const now = new Date().toISOString();
        const { data: upcomingData } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, duration, subtopics!inner(modules!inner(diploma_programs(id)))')
          .eq('program_id', programId)
          .gte('class_date', now)
          .order('class_date', { ascending: true })
          .limit(3);

        // 4. Obtener Ãºltimas grabaciones
        const { data: recordingsData } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, subtopics!inner(modules!inner(diploma_programs(id)))')
          .eq('program_id', programId)
          .not('video_url', 'is', null)
          .order('class_date', { ascending: false })
          .limit(3);

        // 5. Obtener anuncios
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*, teacher_profiles(name)')
          .eq('program_id', programId)
          .order('created_at', { ascending: false })
          .limit(5);

        setDashboardData({
          diplomaTitle: diplomaData?.title || 'Programa en FormaciÃ³n',
          programType: diplomaData?.program_type || 'diplomado',
          modulesCount: modulesData?.length || 0,
          upcomingClasses: upcomingData || [],
          latestRecordings: recordingsData || [],
          firstModuleId: modulesData?.[0]?.id || null,
          announcements: announcementsData || []
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

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
    <div>
      {/* --- ENCABEZADO --- */}
      <div className="page-header">
        <h1 className="page-title">Â¡Hola, Estudiante!</h1>
        <p className="page-description">
          Bienvenido a tu panel de control de <strong>{diplomaTitle}</strong>.
        </p>
      </div>

      {/* --- TARJETAS PRINCIPALES (Resumen) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* Tarjeta de Continuar */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)', color: 'white', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Tu Progreso</h3>
          <p style={{ marginBottom: '1.5rem', opacity: 0.9, fontSize: '0.875rem' }}>
            Los porcentajes se activarÃ¡n prÃ³ximamente. Por ahora, sigue explorando los mÃ³dulos.
          </p>
          <div style={{ marginTop: 'auto' }}>
            {firstModuleId ? (
              <Link to={`/module/${firstModuleId}`} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', width: '100%', justifyContent: 'center' }}>
                <PlayCircle size={20} /> {isCourse ? 'Ir al contenido' : 'Ir al primer mÃ³dulo'}
              </Link>
            ) : (
              <Link to={isCourse ? `/syllabus/${programId}` : `/modules/${programId}`} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', width: '100%', justifyContent: 'center' }}>
                <BookOpen size={20} /> {isCourse ? 'Ver Subtemas' : 'Ver Temario'}
              </Link>
            )}
          </div>
        </div>
        
        {/* Tarjeta de EstadÃ­sticas del Diplomado */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', color: 'var(--text-dark)' }}>Contenido del Programa</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)', lineHeight: 1 }}>{modulesCount}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{isCourse ? 'Bloques de Contenido' : 'MÃ³dulos'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* --- PRÃ“XIMAS CLASES --- */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Calendar size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>PrÃ³ximas Clases en Vivo</h2>
          </div>
          
          {upcomingClasses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingClasses.map(cls => (
                <div key={cls.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{cls.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {cls.date ? new Date(cls.date).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha por confirmar'}
                    </p>
                  </div>
                  <Link to={`/class/${cls.id}`} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    Ver detalle
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
              No hay clases programadas prÃ³ximamente.
            </p>
          )}
        </div>

        {/* --- ÃšLTIMAS GRABACIONES --- */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Video size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Ãšltimas Grabaciones</h2>
          </div>
          
          {latestRecordings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {latestRecordings.map(cls => (
                <div key={cls.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{cls.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Emitida el {cls.date ? new Date(cls.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : ''}
                    </p>
                  </div>
                  <Link to={`/class/${cls.id}`} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    <PlayCircle size={14} /> Ver
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
              AÃºn no hay grabaciones disponibles.
            </p>
          )}
        </div>

      </div>

      {/* --- ANUNCIOS --- */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Megaphone size={20} color="var(--primary-color)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>TablÃ³n de Anuncios</h2>
        </div>
        
        {announcements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {announcements.map(a => (
              <div key={a.id} style={{ padding: '1rem', borderLeft: `4px solid ${a.tag === 'urgent' ? '#dc2626' : a.tag === 'info' ? '#2563eb' : '#cbd5e1'}`, backgroundColor: '#f8fafc', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-dark)', margin: 0 }}>{a.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                  {a.body}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Publicado por: <strong>{a.teacher_profiles?.name || 'AdministraciÃ³n'}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
            No hay anuncios recientes.
          </p>
        )}
      </div>

      {/* --- ACCESOS RÃPIDOS --- */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Accesos RÃ¡pidos</h2>
      <div className="grid-3">
        <Link to={isCourse ? `/syllabus/${programId}` : `/modules/${programId}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: 'var(--primary-color)', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{isCourse ? 'Ver Subtemas' : 'Ver Temario'}</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{isCourse ? 'Explora el contenido del curso' : 'Explora todos los mÃ³dulos'}</p>
          </div>
        </Link>
        <Link to="/teachers" className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: 'var(--primary-color)', borderRadius: 'var(--radius-md)' }}>
            <User size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Cuerpo Docente</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Conoce a tus profesores</p>
          </div>
        </Link>
      </div>
      
    </div>
  );
}


