import { z } from 'zod';
import type { CompatibilityRule } from '@snowrunner/domain';
import { sourcedValueSchema } from './entities';

const id = z.string().trim().min(1);
export const compatibilityRuleSchema: z.ZodType<CompatibilityRule> =
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('requires'),
      componentId: id,
      requiredComponentId: id,
    }),
    z.strictObject({
      kind: z.literal('excludes'),
      componentId: id,
      excludedComponentId: id,
    }),
    z.strictObject({ kind: z.literal('forbids-fixed-bed'), componentId: id }),
    z.strictObject({ kind: z.literal('forbidden'), componentId: id }),
    z.strictObject({
      kind: z.literal('requires-any'),
      componentId: id,
      requiredComponentIds: z.array(id).min(1),
    }),
  ]);
export const compatibilityRulesSchema = z.record(
  id,
  sourcedValueSchema(z.array(compatibilityRuleSchema)),
);

export const ruleCompletenessSchema = z.record(
  id,
  sourcedValueSchema(z.boolean()),
);
