let counter = 0;

/** Identifiant unique local (aucune donnée transmise, aucun serveur). */
export function newId(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${random}`;
}
