// M13: the owner's Plus command's checks (scripts/plus.ts), kept apart so the tests can reach them.

/** An email the Founder grant may put in its SQL: one @, a dot in the domain, and no quote, backslash or space. */
export function founderEmail(value: string): boolean {
  return /^[^\s@'"\\]{1,64}@[^\s@'"\\]{1,190}\.[a-z]{2,}$/i.test(value);
}
