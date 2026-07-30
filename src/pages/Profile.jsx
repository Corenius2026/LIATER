import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Camera, Shield, Save } from 'lucide-react';

export default function Profile() {
  const { currentUser } = useAuth();
  
  // Nombres simulados según el rol
  const getDisplayName = () => {
    if (currentUser?.role === 'admin') return 'Administrador LIATER';
    if (currentUser?.role === 'teacher') return 'Profesor LIATER';
    return 'Estudiante LIATER';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text-dark)', fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Mi Perfil</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Cabecera de Perfil */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <User size={60} />
            </div>
            <button style={{ position: 'absolute', bottom: '0', right: '0', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <Camera size={18} color="var(--text-dark)" />
            </button>
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{getDisplayName()}</h2>
            <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Mail size={16} /> {currentUser?.email || 'usuario@liater.com'}
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              <Shield size={14} /> 
              {currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'teacher' ? 'Profesor' : 'Estudiante'}
            </span>
          </div>
        </div>

        {/* Formulario Simulado */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>Información Personal</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Nombre Completo</label>
              <input type="text" defaultValue={getDisplayName()} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Correo Electrónico</label>
              <input type="email" defaultValue={currentUser?.email || ''} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#94a3b8' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Teléfono</label>
              <input type="tel" placeholder="+57 300 000 0000" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>País</label>
              <select style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <option>Colombia</option>
                <option>México</option>
                <option>Perú</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" style={{ background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', border: 'none' }}>
              <Save size={18} /> Guardar Cambios
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
