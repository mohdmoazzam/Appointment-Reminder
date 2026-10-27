interface PersonName {
  first_name: string;
  last_name: string;
}

/** "Aisha Khan" */
export function fullName(person: PersonName): string {
  return `${person.first_name} ${person.last_name}`.trim();
}

/** "AK" for "Aisha Khan"; "GS" for "Glow Salon". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}
