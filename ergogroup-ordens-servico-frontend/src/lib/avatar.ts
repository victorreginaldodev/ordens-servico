const AVATAR_BY_NAME: Record<string, string> = {
  'Marina Alves': 'bg-pink-100 text-pink-700',
  'Carlos Paiva': 'bg-blue-100 text-blue-700',
  'Daniele Menezes': 'bg-teal-100 text-teal-700',
  'Rafael Lima': 'bg-teal-100 text-teal-700',
  'Bruno Costa': 'bg-pink-100 text-pink-700',
};

export function avatarColor(name: string) {
  return AVATAR_BY_NAME[name] ?? 'bg-slate-100 text-slate-700';
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
