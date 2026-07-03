import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { PlayCircle, BookOpen, Calendar, Video, Clock, User } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    diplomaTitle: 'Diplomado',
    modulesCount: 0,
    classesCount: 0,
    upcomingClasses: [],
    latestRecordings: [],
    firstModuleId: null
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Obtener Diplomado activo (tomamos el primero)
        const { data: diplomaData } = await supabase
          .from('diploma_programs')
          .select('title')
          .limit(1)
          .maybeSingle();

        // 2. Obtener conteo de módulos y el ID del primer módulo
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id')
          .order('order_index', { ascending: true });

        // 3. Obtener conteo total de clases
        const { count: classesCount } = await supabase
          .from('class_sessions')
          .select('*', { count: 'exact', head: true });

        // 4. Obtener próximas clases (fecha > ahora)
        const now = new Date().toISOString();
        const { data: upcomingData } = await supabase
          .from('class_sessions')
          .select('id, title, date, duration')
          .gte('date', now)
          .order('date', { ascending: true })
          .limit(3);

        // 5. Obtener últimas grabaciones (tienen video_url, fecha < ahora)
        const { data: recordingsData } = await supabase
          .from('class_sessions')
          .select('id, title, date')
          .not('video_url', 'is', null)
          .order('date', { ascending: false })
          .limit(3);

        setDashboardData({
          diplomaTitle: diplomaData?.title || 'Diplomado en Formación',
          modulesCount: modulesData?.length || 0,
          classesCount: classesCount || 0,
          upcomingClasses: upcomingData || [],
          latestRecordings: recordingsData || [],
          firstModuleId: modulesData?.[0]?.id || null
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

  const { diplomaTitle, modulesCount, classesCount, upcomingClasses, latestRecordings, firstModuleId } = dashboardData;

  return (
    <div>
      {/* --- ENCABEZADO --- */}
      <div className="page-header">
        <h1 className="page-title">¡Hola, Estudiante!</h1>
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
            Los porcentajes se activarán próximamente. Por ahora, sigue explorando los módulos.
          </p>
          <div style={{ marginTop: 'auto' }}>
            {firstModuleId ? (
              <Link to={`/modules/${firstModuleId}`} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', width: '100%', justifyContent: 'center' }}>
                <PlayCircle size={20} /> Ir al primer módulo
              </Link>
            ) : (
              <Link to="/modules" className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', width: '100%', justifyContent: 'center' }}>
                <BookOpen size={20} /> Ver Temario
              </Link>
            )}
          </div>
        </div>
        
        {/* Tarjeta de Estadísticas del Diplomado */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', color: 'var(--text-dark)' }}>Contenido del Programa</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)', lineHeight: 1 }}>{modulesCount}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Módulos</p>
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <div>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)', lineHeight: 1 }}>{classesCount}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Clases Totales</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* --- PRÓXIMAS CLASES --- */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Calendar size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Próximas Clases en Vivo</h2>
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
              No hay clases programadas próximamente.
            </p>
          )}
        </div>

        {/* --- ÚLTIMAS GRABACIONES --- */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Video size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Últimas Grabaciones</h2>
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
              Aún no hay grabaciones disponibles.
            </p>
          )}
        </div>

      </div>

      {/* --- ACCESOS RÁPIDOS --- */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Accesos Rápidos</h2>
      <div className="grid-3">
        <Link to="/modules" className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: 'var(--primary-color)', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Ver Temario</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Explora todos los módulos</p>
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
