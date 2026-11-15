import type {
  Availability,
  Component,
  SourcedValue,
  Truck,
  TruckBuild,
} from './index';

/** Reviewed rules are truck-specific. Known [] certifies no additional restrictions. */
export type CompatibilityRule =
  | { kind: 'requires'; componentId: string; requiredComponentId: string }
  | { kind: 'excludes'; componentId: string; excludedComponentId: string }
  | { kind: 'forbids-fixed-bed'; componentId: string }
  | { kind: 'forbidden'; componentId: string }
  | {
      kind: 'requires-any';
      componentId: string;
      requiredComponentIds: readonly string[];
    };

export interface CompatibilityCatalog {
  datasetVersion: string;
  trucks: readonly Truck[];
  components: readonly Component[];
  /** When supplied, false/unknown preserves partial rule coverage. */
  ruleCompletenessByTruck?:
    Readonly<Record<string, SourcedValue<boolean>>> | undefined;
  rulesByTruck: Readonly<
    Record<string, SourcedValue<readonly CompatibilityRule[]>>
  >;
}
export interface PlayerAccess {
  rank: number;
  exploredRegionIds: readonly string[];
  dlcIds: readonly string[];
}
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'unknown';
export interface CompatibilityIssue {
  code: string;
  status: 'incompatible' | 'unknown';
  subjectId: string;
  message: string;
  sourceIds: readonly string[];
}
export interface BuildValidation {
  status: CompatibilityStatus;
  violations: readonly CompatibilityIssue[];
  warnings: readonly CompatibilityIssue[];
  /** Single replacements proven compatible for the entire resulting build. */
  alternatives: readonly { socketId: string; componentId: string }[];
}

function evaluate(
  build: TruckBuild,
  catalog: CompatibilityCatalog,
  player?: PlayerAccess,
): Omit<BuildValidation, 'alternatives'> {
  const issues: CompatibilityIssue[] = [];
  function issue(
    code: string,
    status: 'incompatible' | 'unknown',
    subjectId: string,
    message: string,
    sourceIds: readonly string[] = [],
  ): void {
    issues.push({ code, status, subjectId, message, sourceIds });
  }
  function fact<T>(
    value: SourcedValue<T>,
    subject: string,
    code: string,
  ): { value: T; sourceIds: string[] } | undefined {
    if (value.status === 'known')
      return { value: value.value, sourceIds: [value.sourceId] };
    issue(
      code,
      'unknown',
      subject,
      value.reason,
      value.status === 'conflict' ? value.sourceIds : [],
    );
    return undefined;
  }
  function access(availability: Availability, id: string): void {
    const unlock = fact(availability.unlock, id, 'unlock-evidence');
    const dlcs = fact(availability.dlcIds, id, 'dlc-evidence');
    if (unlock && unlock.value.kind !== 'available') {
      if (!player)
        issue(
          'player-access',
          'unknown',
          id,
          'Player progress is required.',
          unlock.sourceIds,
        );
      else if (
        (unlock.value.kind === 'rank' && player.rank < unlock.value.rank) ||
        (unlock.value.kind === 'exploration' &&
          !player.exploredRegionIds.includes(unlock.value.regionId))
      )
        issue(
          'locked',
          'incompatible',
          id,
          'Unlock prerequisite is unmet.',
          unlock.sourceIds,
        );
    }
    if (dlcs && dlcs.value.length > 0) {
      if (!player)
        issue(
          'player-access',
          'unknown',
          id,
          'DLC ownership is required.',
          dlcs.sourceIds,
        );
      else if (dlcs.value.some((id) => !player.dlcIds.includes(id)))
        issue(
          'missing-dlc',
          'incompatible',
          id,
          'Required DLC is unavailable.',
          dlcs.sourceIds,
        );
    }
  }
  if (build.datasetVersion !== catalog.datasetVersion)
    issue(
      'dataset-version',
      'unknown',
      build.id,
      'Build must be migrated to this dataset.',
    );
  const truck = catalog.trucks.find((truck) => truck.id === build.truckId);
  if (!truck)
    issue(
      'unknown-truck',
      'unknown',
      build.truckId,
      'Truck is absent from this catalog.',
    );
  else {
    access(truck.availability, truck.id);
    const sockets = fact(truck.sockets, truck.id, 'socket-evidence');
    const selected = build.selections.flatMap((selection) => {
      const component = catalog.components.find(
        (component) => component.id === selection.componentId,
      );
      if (!component)
        issue(
          'unknown-component',
          'unknown',
          selection.componentId,
          'Component is absent from this catalog.',
        );
      else access(component.availability, component.id);
      return component ? [component] : [];
    });
    const ids = new Set(
      build.selections.map((selection) => selection.componentId),
    );
    const occupied = new Set<string>();
    for (const selection of build.selections) {
      if (occupied.has(selection.socketId))
        issue(
          'socket-occupied',
          'incompatible',
          selection.socketId,
          'Multiple selections occupy one socket.',
        );
      occupied.add(selection.socketId);
      const socket = sockets?.value.find(
        (socket) => socket.id === selection.socketId,
      );
      if (!socket) {
        if (sockets)
          issue(
            'unknown-socket',
            'incompatible',
            selection.socketId,
            'Socket is absent from the known inventory.',
            sockets.sourceIds,
          );
        continue;
      }
      const component = selected.find(
        (component) => component.id === selection.componentId,
      );
      if (component && socket.kind !== component.kind)
        issue(
          'component-kind',
          'incompatible',
          socket.id,
          'Component kind does not match socket.',
          sockets?.sourceIds,
        );
      const compatible = fact(
        socket.compatibleComponentIds,
        socket.id,
        'fitment-evidence',
      );
      if (compatible && !compatible.value.includes(selection.componentId))
        issue(
          'component-fitment',
          'incompatible',
          selection.componentId,
          'Component is not in the socket fitment list.',
          compatible.sourceIds,
        );
      const excluded = fact(
        socket.excludedComponentIds,
        socket.id,
        'exclusion-evidence',
      );
      if (excluded && excluded.value.some((id) => ids.has(id)))
        issue(
          'socket-exclusion',
          'incompatible',
          socket.id,
          'An occupied socket excludes a selected component.',
          excluded.sourceIds,
        );
    }
    for (const component of selected) {
      if (component.kind !== 'wheels') continue;
      const required = fact(
        component.requiredSuspensionIds,
        component.id,
        'suspension-evidence',
      );
      if (
        required &&
        required.value.length > 0 &&
        !selected.some(
          (part) =>
            part.kind === 'suspension' && required.value.includes(part.id),
        )
      ) {
        const unresolved = build.selections.some(
          (selection) =>
            !catalog.components.some(
              (part) => part.id === selection.componentId,
            ),
        );
        issue(
          'wheel-suspension',
          unresolved ? 'unknown' : 'incompatible',
          component.id,
          'Wheels require a selected suspension from the evidenced list.',
          required.sourceIds,
        );
      }
    }
    if (catalog.ruleCompletenessByTruck) {
      const completeness = catalog.ruleCompletenessByTruck[truck.id];
      const complete = completeness
        ? fact(completeness, truck.id, 'rule-completeness')
        : undefined;
      if (!completeness || (complete && !complete.value))
        issue(
          'rule-completeness',
          'unknown',
          truck.id,
          'Restriction coverage is incomplete.',
          complete?.sourceIds,
        );
    }
    const ruleEvidence = catalog.rulesByTruck[truck.id];
    const rules = ruleEvidence
      ? fact(ruleEvidence, truck.id, 'rule-evidence')
      : undefined;
    if (!ruleEvidence)
      issue(
        'rule-evidence',
        'unknown',
        truck.id,
        'Additional restriction evidence is missing.',
      );
    if (rules)
      for (const rule of rules.value) {
        if (!ids.has(rule.componentId)) continue;
        if (rule.kind === 'forbidden')
          issue(
            'forbidden-component',
            'incompatible',
            rule.componentId,
            'Component is explicitly forbidden for this truck.',
            rules.sourceIds,
          );
        if (
          rule.kind === 'requires-any' &&
          !rule.requiredComponentIds.some((id) => ids.has(id))
        )
          issue(
            'missing-dependency',
            'incompatible',
            rule.componentId,
            'Requires one of the evidenced component alternatives.',
            rules.sourceIds,
          );
        if (rule.kind === 'requires' && !ids.has(rule.requiredComponentId))
          issue(
            'missing-dependency',
            'incompatible',
            rule.componentId,
            `Requires ${rule.requiredComponentId}.`,
            rules.sourceIds,
          );
        if (rule.kind === 'excludes' && ids.has(rule.excludedComponentId))
          issue(
            'exclusive-components',
            'incompatible',
            rule.componentId,
            `Excludes ${rule.excludedComponentId}.`,
            rules.sourceIds,
          );
        if (rule.kind === 'forbids-fixed-bed') {
          const bed = fact(truck.bed, truck.id, 'bed-evidence');
          if (bed?.value.kind === 'fixed')
            issue(
              'fixed-bed',
              'incompatible',
              rule.componentId,
              'Component is forbidden with a fixed bed.',
              [...rules.sourceIds, ...bed.sourceIds],
            );
        }
      }
  }
  const violations = issues.filter((issue) => issue.status === 'incompatible');
  const warnings = issues.filter((issue) => issue.status === 'unknown');
  return {
    status: violations.length
      ? 'incompatible'
      : warnings.length
        ? 'unknown'
        : 'compatible',
    violations,
    warnings,
  };
}

export function validateBuild(
  build: TruckBuild,
  catalog: CompatibilityCatalog,
  player?: PlayerAccess,
): BuildValidation {
  const result = evaluate(build, catalog, player);
  const alternatives: { socketId: string; componentId: string }[] = [];
  const truck = catalog.trucks.find((truck) => truck.id === build.truckId);
  if (result.status !== 'compatible' && truck?.sockets.status === 'known') {
    for (const socket of truck.sockets.value) {
      if (socket.compatibleComponentIds.status !== 'known') continue;
      if (
        !build.selections.some((selection) => selection.socketId === socket.id)
      )
        continue;
      for (const componentId of socket.compatibleComponentIds.value) {
        if (
          build.selections.some(
            (selection) =>
              selection.socketId === socket.id &&
              selection.componentId === componentId,
          )
        )
          continue;
        const candidate = {
          ...build,
          selections: build.selections.map((selection) =>
            selection.socketId === socket.id
              ? { socketId: socket.id, componentId }
              : selection,
          ),
        };
        if (evaluate(candidate, catalog, player).status === 'compatible')
          alternatives.push({ socketId: socket.id, componentId });
      }
    }
  }
  return { ...result, alternatives };
}
