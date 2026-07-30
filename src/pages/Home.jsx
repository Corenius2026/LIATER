import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="public-layout">
      <div className="card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--primary-color)', marginBottom: '1rem', fontSize: '2.5rem' }}>Laboratorio LIATER</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.25rem' }}>
          Portal Académico oficial para la gestión de cursos y diplomados.
        </p>
        <Link to="/login" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
          Ingresar al Portal
        </Link>
      </div>
    </div>
  );
}
