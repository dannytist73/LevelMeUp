import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARTICLE_CLUSTERS } from '../../../packages/content/src/index.ts';

const SQL = readFileSync(join(import.meta.dirname, '..', '..', 'migrations', '0014_article_library.sql'), 'utf8');

describe('migration 0014 (M8a)', () => {
  it("allows exactly the content package's clusters", () => {
    const list = /cluster text not null check \(cluster in \(([^)]*)\)\)/.exec(SQL)?.[1];
    expect(list?.split(',').map((s) => s.trim().replace(/'/g, ''))).toEqual([...ARTICLE_CLUSTERS]);
  });

  it('gives lmu_service the pipeline functions and nothing on the tables', () => {
    expect(SQL).toMatch(/grant execute on function levelmeup\.article_store\(bigint, jsonb, jsonb\)/);
    expect(SQL).not.toMatch(/grant (select|insert|update|delete)[^;]*to lmu_service/i);
  });
});
