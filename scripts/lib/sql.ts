// Small, careful SQL text helpers for the lints and runners. Not a parser: they only need to find comments,
// quoted text and dollar-quoted bodies so checks don't trip over them.

/** Removes `--` and `/* … *\/` comments, keeping quoted strings and dollar-quoted bodies intact. */
export function stripComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const rest = sql.slice(i);
    const dollar = /^\$[A-Za-z_]*\$/.exec(rest);
    if (dollar) {
      const end = sql.indexOf(dollar[0], i + dollar[0].length);
      const stop = end === -1 ? sql.length : end + dollar[0].length;
      out += sql.slice(i, stop);
      i = stop;
    } else if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : 1;
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (rest.startsWith('--')) {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
    } else if (rest.startsWith('/*')) {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else {
      out += sql[i];
      i++;
    }
  }
  return out;
}

/** Replaces every dollar-quoted body (`$$ … $$`, `$fn$ … $fn$`) with an empty one, after removing comments. */
export function stripBodies(sql: string): string {
  return stripComments(sql).replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, '$$$$');
}

/** Statements at the top level (bodies emptied), trimmed, without the trailing semicolon. */
export function topLevelStatements(sql: string): string[] {
  return stripBodies(sql)
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
