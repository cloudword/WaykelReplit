type EntityPrefix = 'T' | 'V' | 'D' | 'C' | 'B' | 'R';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateEntityId(prefix: EntityPrefix): string {
  let id = prefix;
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    id += CHARSET[randomIndex];
  }
  return id;
}

export function isValidEntityId(id: string): boolean {
  if (!id || id.length !== 6) return false;
  const prefix = id[0];
  if (!['T', 'V', 'D', 'C'].includes(prefix)) return false;
  const rest = id.slice(1);
  return /^[A-HJ-NP-Z2-9]{5}$/.test(rest);
}

export function getEntityTypeFromId(id: string): 'transporter' | 'vehicle' | 'driver' | 'customer' | 'ride' | 'bid' | null {
  if (!isValidEntityId(id)) return null;
  switch (id[0]) {
    case 'T': return 'transporter';
    case 'V': return 'vehicle';
    case 'D': return 'driver';
    case 'C': return 'customer';
    case 'R': return 'ride';
    case 'B': return 'bid';
    default: return null;
  }
}
