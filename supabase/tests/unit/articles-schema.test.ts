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

describe('migration 0015 (M8b)', () => {
  it("set_insight's eight topics are the content package's (0015)", () => {
    const sql = readFileSync(join(import.meta.dirname, '..', '..', 'migrations', '0015_reading.sql'), 'utf8');
    const list = /p_cluster not in \(([^)]+)\)/.exec(sql)![1]!.split(',').map((s) => s.trim().replace(/'/g, ''));
    expect(list).toEqual([...ARTICLE_CLUSTERS]);
  });
});
