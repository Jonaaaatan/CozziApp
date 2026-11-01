// Niveles y logros de la sección 14 de la propuesta.
// Todo se calcula a partir del historial de recetas completadas.
export const LEVELS = [
  { level: 1, name: 'Principiante', min: 0 },   // 0 a 4
  { level: 2, name: 'Aprendiz', min: 5 },       // 5 a 14
  { level: 3, name: 'Cocinero', min: 15 },      // 15 a 29
  { level: 4, name: 'Chef', min: 30 },          // 30 en adelante
];

export const ACHIEVEMENTS = [
  { id: 'principiante', label: 'Cocinero principiante', desc: 'Preparó su primera receta', test: (s) => s.total >= 1 },
  { id: 'casero', label: 'Chef casero', desc: 'Preparó 5 recetas', test: (s) => s.total >= 5 },
  { id: 'experto', label: 'Chef experto', desc: 'Preparó 15 recetas', test: (s) => s.total >= 15 },
  { id: 'repostero', label: 'Repostero', desc: 'Preparó 5 postres', test: (s) => s.desserts >= 5 },
];

export function computeStats(history = []) {
  const total = history.length;
  const desserts = history.filter((h) => h.category === 'Postre').length;

  let current = LEVELS[0];
  for (const l of LEVELS) if (total >= l.min) current = l;
  const next = LEVELS.find((l) => l.min > current.min) ?? null;

  const progress = next ? (total - current.min) / (next.min - current.min) : 1;
  const base = { total, desserts };
  return {
    total,
    desserts,
    level: current.level,
    levelName: current.name,
    nextLevelName: next?.name ?? null,
    remainingToNext: next ? next.min - total : 0,
    progress,
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.test(base) })),
  };
}
