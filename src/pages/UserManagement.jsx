import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  UserPlus, Users, GraduationCap, ShieldAlert, X, Mail,
  Pencil, Trash2, CheckCircle, BookOpen, PhoneCall, Globe,
  ToggleLeft, ToggleRight, Send, RefreshCw, Eye, EyeOff, ChevronDown
} from "lucide-react";
import "./AdminPanel.css";

// ─── Helpers ────────────────────────────────────────────────
function AuthStatusBadge({ status }) {
  const map = {
    active:   { bg: "#d1fae5", color: "#065f46", label: "Activo" },
    pending:  { bg: "#fef3c7", color: "#92400e", label: "Invitacion Pendiente" },
    inactive: { bg: "#fee2e2", color: "#991b1b", label: "Inactivo" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#64748b", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "12px", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Initials({ name, size = 36 }) {
  const parts = (name || "").trim().split(" ");
  const letters = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, var(--navy) 0%, #1e4080 100%)",
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.37, flexShrink: 0, letterSpacing: "-0.5px"
    }}>{letters || "?"}</div>
  );
}

// ─── Modal crear usuario ─────────────────────────────────────
function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const [roleSelected, setRoleSelected] = useState("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) { setFullName(""); setEmail(""); setArea(""); setBio(""); setError(""); setSuccess(""); setRoleSelected("student"); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!fullName.trim() || !email.trim()) { setError("El nombre y el correo son obligatorios."); return; }
    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("invite-user", {
        body: { email: email.trim(), full_name: fullName.trim(), role: roleSelected, area: area.trim() || null, bio: bio.trim() || null }
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setSuccess(`Invitacion enviada a ${email}. El usuario recibira un correo para crear su contrasena.`);
      setTimeout(() => { onSuccess?.(); onClose(); }, 2800);
    } catch (err) {
      setError(err.message || "Error al enviar invitacion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
      <div style={{ width: "100%", maxWidth: "480px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 48px rgba(0,0,0,0.25)" }}>
        <div style={{ background: "var(--navy)", padding: "1.4rem 1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.2rem" }}>Nuevo Usuario</div>
            <h3 style={{ margin: 0, color: "white", fontWeight: 800, fontSize: "1.05rem" }}>Invitar por correo electronico</h3>
          </div>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.7rem 1rem", borderRadius: "8px", fontSize: "0.84rem" }}>{error}</div>}
          {success && (
            <div style={{ background: "#f0fdf4", color: "#15803d", padding: "0.7rem 1rem", borderRadius: "8px", fontSize: "0.84rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}

          {/* Rol */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "0.84rem" }}>Rol del usuario</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { id: "student", label: "Estudiante", icon: <Users size={18} /> },
                { id: "teacher", label: "Profesor", icon: <GraduationCap size={18} /> },
              ].map(r => (
                <button type="button" key={r.id} onClick={() => setRoleSelected(r.id)} style={{
                  padding: "0.75rem", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem",
                  border: roleSelected === r.id ? "2px solid var(--gold-dark)" : "2px solid var(--border-color)",
                  background: roleSelected === r.id ? "var(--gold-subtle)" : "white",
                  fontWeight: 700, fontSize: "0.875rem",
                  color: roleSelected === r.id ? "var(--navy)" : "var(--text-muted)",
                  transition: "all 0.15s"
                }}>
                  {React.cloneElement(r.icon, { color: roleSelected === r.id ? "var(--gold-dark)" : "var(--text-muted)" })}
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Nombre completo</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} required placeholder="Ej: Maria Garcia" />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Correo electronico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} required placeholder="ejemplo@correo.com" />
          </div>

          {roleSelected === "teacher" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Area / Especialidad</label>
                <input type="text" value={area} onChange={e => setArea(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} placeholder="Ej: Derecho Penal" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Biografia breve</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid var(--border-color)", borderRadius: "8px", minHeight: "65px" }} placeholder="Descripcion del profesor..." />
              </div>
            </>
          )}

          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.78rem", color: "#0369a1", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <Send size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>El usuario recibira un correo de <strong>Supabase</strong> con un enlace para crear su propia contrasena. No necesitas escribir ninguna contrasena.</span>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
            <button type="button" onClick={onClose} style={{ padding: "0.65rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#f8fafc", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ padding: "0.65rem 1.5rem", borderRadius: "8px", border: "none", background: "var(--navy)", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Mail size={15} />
              {submitting ? "Enviando..." : "Enviar Invitacion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Drawer de Estudiante ────────────────────────────────────
function StudentDrawer({ isOpen, onClose, student, onRefresh }) {
  const [activeTab, setActiveTab] = useState("perfil");
  const [diplomas, setDiplomas] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && student) {
      setActiveTab("perfil");
      setFullName(student.full_name || "");
      setPhone(student.phone && student.phone !== "—" ? student.phone : "");
      setCountry(student.country || "");
      setSuccess(""); setError("");
      fetchEnrollmentData();
    }
  }, [isOpen, student]);

  const fetchEnrollmentData = async () => {
    if (!student) return;
    setLoading(true);
    const { data: dData } = await supabase.from("diploma_programs").select("id, title, program_type");
    const { data: eData } = await supabase.from("enrollments").select("program_id").eq("student_id", student.id);
    setDiplomas(dData || []);
    setEnrollments(eData ? eData.map(e => e.program_id) : []);
    setLoading(false);
  };

  const handleToggleEnroll = async (programId) => {
    const isEnrolled = enrollments.includes(programId);
    try {
      if (isEnrolled) {
        await supabase.from("enrollments").delete().eq("student_id", student.id).eq("program_id", programId);
        setEnrollments(prev => prev.filter(id => id !== programId));
      } else {
        await supabase.from("enrollments").insert([{ student_id: student.id, program_id: programId }]);
        setEnrollments(prev => [...prev, programId]);
      }
      onRefresh?.();
    } catch (err) { console.error(err); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await supabase.from("users_profile").update({ full_name: fullName, phone, country }).eq("id", student.id);
      setSuccess("Perfil actualizado.");
      onRefresh?.();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleResendInvite = async () => {
    try {
      await supabase.functions.invoke("invite-user", {
        body: { email: student.email, full_name: student.full_name, role: student.role }
      });
      alert("Invitacion reenviada a " + student.email);
    } catch (err) { alert("Error: " + err.message); }
  };

  if (!isOpen || !student) return null;

  const TABS = [
    { id: "perfil", label: "Perfil" },
    { id: "inscripciones", label: "Inscripciones" },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "560px", maxWidth: "95vw",
        background: "white", zIndex: 1001, display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", animation: "slideInRight 0.3s ease-out"
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        <div style={{ background: "var(--navy)", padding: "1.25rem 1.5rem", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <Initials name={student.full_name} size={48} />
              <div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Estudiante</div>
                <div style={{ color: "white", fontWeight: 800, fontSize: "1.05rem" }}>{student.full_name}</div>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.1rem" }}>{student.email}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <AuthStatusBadge status={student.is_active ? "active" : "inactive"} />
            {!student.is_active && (
              <button onClick={handleResendInvite} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "0.2rem 0.6rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <RefreshCw size={10} /> Reenviar invitacion
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", background: "#fafafa", flexShrink: 0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: "0.85rem", border: "none", background: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.82rem", borderBottom: activeTab === tab.id ? "2px solid var(--gold-dark)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--navy)" : "var(--text-muted)", marginBottom: "-2px", transition: "all 0.15s"
            }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {activeTab === "perfil" && (
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {success && <div style={{ background: "#f0fdf4", color: "#15803d", padding: "0.6rem", borderRadius: "8px", fontSize: "0.84rem" }}>&#10003; {success}</div>}
              {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.6rem", borderRadius: "8px", fontSize: "0.84rem" }}>{error}</div>}
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Nombre completo</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Correo</label>
                <input value={student.email} readOnly style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#f8fafc", color: "var(--text-muted)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Telefono</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} placeholder="+57 300..." />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Pais</label>
                  <input value={country} onChange={e => setCountry(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
                </div>
              </div>
              <button type="submit" disabled={submitting} style={{ padding: "0.65rem 1.5rem", background: "var(--navy)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
                {submitting ? "Guardando..." : "Guardar Perfil"}
              </button>
            </form>
          )}

          {activeTab === "inscripciones" && (
            <div>
              <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Activa o desactiva la inscripcion de <strong>{student.full_name}</strong> en cada programa.</p>
              {loading ? <p style={{ color: "var(--text-muted)" }}>Cargando...</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {diplomas.map(d => {
                    const enrolled = enrollments.includes(d.id);
                    return (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", border: "1px solid var(--border-color)", borderRadius: "10px", background: enrolled ? "#f0fdf4" : "#fafafa", transition: "all 0.2s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <BookOpen size={16} color={enrolled ? "#16a34a" : "var(--text-muted)"} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--navy)" }}>{d.title}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{d.program_type === "curso" ? "Curso" : "Diplomado"}</div>
                          </div>
                        </div>
                        <button onClick={() => handleToggleEnroll(d.id)} style={{
                          padding: "0.35rem 0.85rem", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
                          background: enrolled ? "#16a34a" : "var(--border-color)",
                          color: enrolled ? "white" : "var(--text-muted)", transition: "all 0.2s"
                        }}>
                          {enrolled ? "Inscrito" : "No inscrito"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Drawer de Profesor ──────────────────────────────────────
function TeacherDrawer({ isOpen, onClose, teacher, onRefresh }) {
  const [activeTab, setActiveTab] = useState("perfil");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [programs, setPrograms] = useState([]);
  const [assignedPrograms, setAssignedPrograms] = useState([]);

  useEffect(() => {
    if (isOpen && teacher) {
      setActiveTab("perfil");
      setName(teacher.full_name || "");
      setArea(teacher.area || "");
      setBio(teacher.bio || "");
      setSuccess(""); setError("");
      fetchPrograms();
    }
  }, [isOpen, teacher]);

  const fetchPrograms = async () => {
    if (!teacher) return;
    const { data: pData } = await supabase.from("diploma_programs").select("id, title, program_type");
    const { data: eData } = await supabase.from("enrollments").select("program_id").eq("student_id", teacher.id);
    setPrograms(pData || []);
    setAssignedPrograms(eData ? eData.map(e => e.program_id) : []);
  };

  const handleToggleProgram = async (programId) => {
    const isAssigned = assignedPrograms.includes(programId);
    if (isAssigned) {
      await supabase.from("enrollments").delete().eq("student_id", teacher.id).eq("program_id", programId);
      setAssignedPrograms(prev => prev.filter(id => id !== programId));
    } else {
      await supabase.from("enrollments").insert([{ student_id: teacher.id, program_id: programId }]);
      setAssignedPrograms(prev => [...prev, programId]);
    }
    onRefresh?.();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await supabase.from("users_profile").update({ full_name: name }).eq("id", teacher.id);
      if (teacher.teacher_profile_id) {
        await supabase.from("teacher_profiles").update({ name, area, bio }).eq("id", teacher.teacher_profile_id);
      }
      setSuccess("Perfil actualizado.");
      onRefresh?.();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (!isOpen || !teacher) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "560px", maxWidth: "95vw",
        background: "white", zIndex: 1001, display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", animation: "slideInRight 0.3s ease-out"
      }}>
        <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, var(--navy) 100%)", padding: "1.25rem 1.5rem", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1.1rem" }}>
                {(teacher.full_name || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Profesor</div>
                <div style={{ color: "white", fontWeight: 800, fontSize: "1.05rem" }}>{teacher.full_name}</div>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>{teacher.area || teacher.email}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", background: "#fafafa", flexShrink: 0 }}>
          {["perfil", "programas"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: "0.85rem", border: "none", background: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.82rem", borderBottom: activeTab === tab ? "2px solid var(--gold-dark)" : "2px solid transparent",
              color: activeTab === tab ? "var(--navy)" : "var(--text-muted)", marginBottom: "-2px", transition: "all 0.15s",
              textTransform: "capitalize"
            }}>{tab}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {activeTab === "perfil" && (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {success && <div style={{ background: "#f0fdf4", color: "#15803d", padding: "0.6rem", borderRadius: "8px", fontSize: "0.84rem" }}>&#10003; {success}</div>}
              {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.6rem", borderRadius: "8px", fontSize: "0.84rem" }}>{error}</div>}
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Nombre</label>
                <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Correo</label>
                <input value={teacher.email} readOnly style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#f8fafc", color: "var(--text-muted)" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Area / Especialidad</label>
                <input value={area} onChange={e => setArea(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "0.84rem" }}>Biografia</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border-color)", borderRadius: "8px", minHeight: "80px" }} />
              </div>
              <button type="submit" disabled={submitting} style={{ padding: "0.65rem 1.5rem", background: "var(--navy)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
                {submitting ? "Guardando..." : "Guardar Cambios"}
              </button>
            </form>
          )}

          {activeTab === "programas" && (
            <div>
              <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Asigna o quita <strong>{teacher.full_name}</strong> de los programas.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {programs.map(p => {
                  const assigned = assignedPrograms.includes(p.id);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", border: "1px solid var(--border-color)", borderRadius: "10px", background: assigned ? "#eff6ff" : "#fafafa", transition: "all 0.2s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <GraduationCap size={16} color={assigned ? "#1d4ed8" : "var(--text-muted)"} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--navy)" }}>{p.title}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{p.program_type === "curso" ? "Curso" : "Diplomado"}</div>
                        </div>
                      </div>
                      <button onClick={() => handleToggleProgram(p.id)} style={{
                        padding: "0.35rem 0.85rem", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
                        background: assigned ? "#1d4ed8" : "var(--border-color)",
                        color: assigned ? "white" : "var(--text-muted)", transition: "all 0.2s"
                      }}>
                        {assigned ? "Asignado" : "Sin asignar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────
export default function UserManagement() {
  const { currentUser } = useAuth();
  const roleAuth = currentUser?.role;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewRole, setViewRole] = useState("student");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: uProfiles } = await supabase.from("users_profile").select("*").order("created_at", { ascending: false });
      const { data: tProfiles } = await supabase.from("teacher_profiles").select("*");

      const teacherMap = new Map();
      if (tProfiles) tProfiles.forEach(tp => { if (tp.user_id) teacherMap.set(String(tp.user_id), tp); });

      const enriched = (uProfiles || []).map(u => {
        const tp = teacherMap.get(String(u.id)) || teacherMap.get(String(u.auth_user_id));
        return {
          ...u,
          area: tp?.area || "",
          bio: tp?.bio || "",
          photo_url: tp?.photo_url || tp?.photo || "",
          teacher_profile_id: tp?.id || null,
          phone: u.phone || "—",
          country: u.country || "",
        };
      });
      setUsers(enriched);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (roleAuth === "admin") fetchUsers(); }, [roleAuth, fetchUsers]);

  if (roleAuth !== "admin") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem", color: "var(--text-muted)" }}>
      <ShieldAlert size={48} color="#dc2626" />
      <h2>Acceso Denegado</h2>
      <p>Esta vista es exclusiva para administradores.</p>
    </div>
  );

  const filtered = users.filter(u => {
    if (u.role !== viewRole) return false;
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return u.full_name?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t) || u.area?.toLowerCase().includes(t);
  });

  const openDrawer = (user) => { setDrawerUser(user); setDrawerOpen(true); };

  const handleToggleStatus = async (user) => {
    setProcessingId(user.id);
    try {
      await supabase.from("users_profile").update({ is_active: !user.is_active }).eq("id", user.id);
      fetchUsers();
    } catch (err) { console.error(err); }
    finally { setProcessingId(null); setConfirmDeactivate(null); }
  };

  const counts = {
    student: users.filter(u => u.role === "student").length,
    teacher: users.filter(u => u.role === "teacher").length,
  };

  return (
    <div style={{ animation: "fadeSlideUp 0.35s ease-out" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--navy)", margin: 0 }}>Gestion de Usuarios</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", marginTop: "0.25rem" }}>Administra estudiantes y profesores de la plataforma.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--navy)", color: "white", border: "none", borderRadius: "10px", padding: "0.7rem 1.25rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(20,33,61,0.25)" }}
        >
          <UserPlus size={17} /> Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Estudiantes", count: counts.student, icon: <Users size={20} />, role: "student", color: "#3730a3", bg: "#e0e7ff" },
          { label: "Profesores", count: counts.teacher, icon: <GraduationCap size={20} />, role: "teacher", color: "#065f46", bg: "#d1fae5" },
        ].map(stat => (
          <div key={stat.role} onClick={() => setViewRole(stat.role)} style={{
            background: "white", borderRadius: "12px", padding: "1.25rem 1.5rem", border: viewRole === stat.role ? "2px solid var(--gold-dark)" : "1px solid var(--border-color)",
            cursor: "pointer", transition: "all 0.2s", boxShadow: viewRole === stat.role ? "0 4px 12px rgba(252,163,17,0.15)" : "var(--shadow-sm)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center", color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--navy)", lineHeight: 1 }}>{stat.count}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "student", label: "Estudiantes", count: counts.student },
              { id: "teacher", label: "Profesores", count: counts.teacher },
            ].map(tab => (
              <button key={tab.id} onClick={() => setViewRole(tab.id)} style={{
                padding: "0.5rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.84rem",
                background: viewRole === tab.id ? "var(--gold-subtle)" : "transparent",
                color: viewRole === tab.id ? "var(--gold-dark)" : "var(--text-muted)", transition: "all 0.15s"
              }}>
                {tab.label} <span style={{ fontSize: "0.75rem", background: viewRole === tab.id ? "var(--gold-dark)" : "#e2e8f0", color: viewRole === tab.id ? "white" : "var(--text-muted)", borderRadius: "10px", padding: "0.1rem 0.45rem", marginLeft: "0.3rem", fontWeight: 700 }}>{tab.count}</span>
              </button>
            ))}
          </div>
          <input
            type="text" placeholder={viewRole === "student" ? "Buscar estudiante..." : "Buscar profesor..."}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: "0.5rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "0.84rem", minWidth: "220px" }}
          />
        </div>

        {/* TABLE */}
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                {viewRole === "teacher" && <th>Area</th>}
                <th>Estado</th>
                <th>Registro</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem" }}>Cargando usuarios...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem" }}>No se encontraron {viewRole === "student" ? "estudiantes" : "profesores"}.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} style={{ transition: "background 0.15s" }}>
                  <td>
                    <div className="user-cell">
                      {u.photo_url ? (
                        <img src={u.photo_url} alt={u.full_name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <Initials name={u.full_name} size={36} />
                      )}
                      <div>
                        <div className="user-name">{u.full_name}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  {viewRole === "teacher" && <td><span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.area || "—"}</span></td>}
                  <td><AuthStatusBadge status={u.is_active !== false ? "active" : "inactive"} /></td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{new Date(u.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", alignItems: "center" }}>
                      <button onClick={() => openDrawer(u)} title="Editar" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.3rem 0.65rem", background: "var(--navy)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(u)}
                        title={u.is_active !== false ? "Desactivar" : "Reactivar"}
                        style={{ padding: "0.3rem 0.6rem", background: u.is_active !== false ? "#fef2f2" : "#f0fdf4", color: u.is_active !== false ? "#dc2626" : "#16a34a", border: "1px solid", borderColor: u.is_active !== false ? "#fca5a5" : "#86efac", borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                      >
                        {u.is_active !== false ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWERS */}
      {viewRole === "student" ? (
        <StudentDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} student={drawerUser} onRefresh={fetchUsers} />
      ) : (
        <TeacherDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} teacher={drawerUser} onRefresh={fetchUsers} />
      )}

      {/* CREATE MODAL */}
      <CreateUserModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={fetchUsers} />

      {/* CONFIRM DEACTIVATE */}
      {confirmDeactivate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.75rem", maxWidth: "400px", width: "100%", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontWeight: 800 }}>
              {confirmDeactivate.is_active !== false ? "Desactivar Usuario" : "Reactivar Usuario"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {confirmDeactivate.is_active !== false
                ? `Se ocultara "${confirmDeactivate.full_name}" de las listas activas. Podras reactivarlo despues.`
                : `Se reactivara la cuenta de "${confirmDeactivate.full_name}".`}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button onClick={() => setConfirmDeactivate(null)} style={{ padding: "0.6rem 1.25rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => handleToggleStatus(confirmDeactivate)} disabled={processingId === confirmDeactivate.id} style={{ padding: "0.6rem 1.25rem", border: "none", borderRadius: "8px", background: confirmDeactivate.is_active !== false ? "#dc2626" : "#16a34a", color: "white", cursor: "pointer", fontWeight: 700 }}>
                {processingId === confirmDeactivate.id ? "Procesando..." : (confirmDeactivate.is_active !== false ? "Desactivar" : "Activar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
