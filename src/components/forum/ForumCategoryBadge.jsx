/**
 * ForumCategoryBadge
 * Badge visual que indica la categoría de un hilo del foro.
 * Categorías: academic (Académica), debate (Debate), support (Soporte)
 */
const CATEGORY_CONFIG = {
  academic: {
    label: 'Dudas Académicas',
    color: '#92400e',
    bg: 'rgba(252, 163, 17, 0.12)',
    border: 'rgba(252, 163, 17, 0.35)',
  },
  debate: {
    label: 'Debate',
    color: '#1e3a8a',
    bg: 'rgba(30, 58, 138, 0.08)',
    border: 'rgba(30, 58, 138, 0.25)',
  },
};

export default function ForumCategoryBadge({ category, size = 'sm' }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.academic;

  const fontSize = size === 'xs' ? '0.68rem' : '0.72rem';
  const padding  = size === 'xs' ? '0.15rem 0.5rem' : '0.2rem 0.65rem';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '999px',
      padding,
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px',
    }}>
      {cfg.label}
    </span>
  );
}
