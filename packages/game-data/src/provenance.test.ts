import { describe, expect, it } from 'vitest';
import { provenanceSchema } from './index';

const validSource = {
  sourceId: 'test-fixture',
  sourceUrl: 'https://example.com/source',
  sourceVersion: 'fixture-v1',
  retrievedAt: '2026-11-04T00:00:00.000Z',
  usageRights: 'Synthetic test fixture, no game content',
};
describe('data provenance boundary', () => {
  it('accepts a versioned source with attribution and usage rights', () => {
    expect(provenanceSchema.safeParse(validSource).success).toBe(true);
  });
  it.each([
    'sourceId',
    'sourceUrl',
    'sourceVersion',
    'retrievedAt',
    'usageRights',
  ])('rejects a missing %s field', (field) => {
    const input: Record<string, unknown> = { ...validSource };
    delete input[field];
    expect(provenanceSchema.safeParse(input).success).toBe(false);
  });
  it('rejects malformed URLs, timestamps, and blank source versions', () => {
    expect(
      provenanceSchema.safeParse({ ...validSource, sourceUrl: 'sheet' })
        .success,
    ).toBe(false);
    expect(
      provenanceSchema.safeParse({ ...validSource, retrievedAt: 'yesterday' })
        .success,
    ).toBe(false);
    expect(
      provenanceSchema.safeParse({ ...validSource, sourceVersion: ' ' })
        .success,
    ).toBe(false);
  });
});
