type EntityPrefix = 'T' | 'V' | 'D' | 'C';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateEntityId(prefix: EntityPrefix): string {
  let id = prefix;
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    id += CHARSET[randomIndex];
  }
  return id;
}

export function isValidEntityId(id: string): boolean {
  if (!id || id.length !== 7) return false;
  const prefix = id[0];
  if (!['T', 'V', 'D', 'C'].includes(prefix)) return false;
  const rest = id.slice(1);
  return /^[A-HJ-NP-Z2-9]{6}$/.test(rest);
}

export function getEntityTypeFromId(id: string): 'transporter' | 'vehicle' | 'driver' | 'customer' | null {
  if (!isValidEntityId(id)) return null;
  switch (id[0]) {
    case 'T': return 'transporter';
    case 'V': return 'vehicle';
    case 'D': return 'driver';
    case 'C': return 'customer';
    default: return null;
  }
}
