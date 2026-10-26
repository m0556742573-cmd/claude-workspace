// Invented names for the demo booth, until the real community list is loaded on the server.
// None of these are real people.
export interface Person { id: string; fullName: string; city: string; businessOwner: boolean }

const first = ['אברהם', 'יצחק', 'יעקב', 'משה', 'אהרן', 'יוסף', 'שמואל', 'דוד', 'שלמה', 'מנחם', 'ישראל', 'חיים', 'מרדכי', 'נחום', 'שמעון', 'בנימין'];
const last = ['גרינברג', 'וייס', 'פרידמן', 'שטרן', 'רוזנבלום', 'קליין', 'הורוביץ', 'לנדאו', 'ברגר', 'גולדשטיין', 'פישר', 'שפירא'];
const cities = ['ירושלים', 'בני ברק', 'בית שמש', 'אלעד', 'ביתר עילית', 'אשדוד'];

export const demoPeople: Person[] = Array.from({ length: 96 }, (_, i) => ({
  id: `demo-${i + 1}`,
  fullName: `${first[i % first.length]} ${last[(i * 7) % last.length]}`,
  city: cities[(i * 5) % cities.length]!,
  businessOwner: i % 3 === 0,
}));

export function searchPeople(q: string, max = 8): Person[] {
  const t = q.trim();
  if (t.length < 2) return [];
  const parts = t.split(/\s+/);
  return demoPeople.filter((p) => parts.every((w) => p.fullName.includes(w))).slice(0, max);
}
