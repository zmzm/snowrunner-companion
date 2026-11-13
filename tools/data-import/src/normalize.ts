import type { Component, Truck } from '@snowrunner/domain';
import type { Manifest } from './manifest';
import {
  buildCandidates,
  mergeCandidates,
  type MergedCandidate,
} from './candidates';
import {
  buildTruck,
  buildEngine,
  buildGearbox,
  buildWheels,
  buildAddon,
} from './build-entities';
import { readTabRows, requireFile, type ColumnMappings } from './table';
import type {
  FieldDisposition,
  ImportFile,
  NormalizationReport,
} from './report';

export function normalizeImport(
  manifest: Manifest,
  files: ReadonlyMap<string, ImportFile>,
): { trucks: Truck[]; components: Component[]; report: NormalizationReport } {
  const report: NormalizationReport = {
    manifestVersion: 1,
    datasetVersion: manifest.datasetVersion,
    inputs: [],
    canonicalIds: [],
    unmappedColumns: [],
    discardedRows: [],
    inconsistencies: [],
    entities: { trucks: [], components: [] },
  };
  const trucks: Truck[] = [];
  const components: Component[] = [];

  const trucksInput = manifest.trucks;
  if (trucksInput !== undefined) {
    const file = requireFile(files, trucksInput.path);
    const dataRows = readTabRows(
      file,
      trucksInput.path,
      trucksInput.columns,
      report,
    );
    const candidates = buildCandidates(
      trucksInput.path,
      trucksInput.columns,
      trucksInput.columns.xmlName,
      dataRows,
      report,
      null,
    );
    for (const merged of mergeCandidates(candidates)) {
      const { truck, fields } = buildTruck(
        merged,
        trucksInput.path,
        trucksInput.sourceId,
        trucksInput.columns,
        report.inconsistencies,
      );
      trucks.push(truck);
      report.entities.trucks.push({
        id: truck.id,
        row: merged.firstLine,
        fields,
      });
    }
  }

  processComponentTab(
    manifest.engines,
    'engine',
    files,
    report,
    components,
    buildEngine,
  );
  processComponentTab(
    manifest.gearboxes,
    'gearbox',
    files,
    report,
    components,
    buildGearbox,
  );
  processComponentTab(
    manifest.wheels,
    'wheels',
    files,
    report,
    components,
    buildWheels,
  );
  processComponentTab(
    manifest.addons,
    'addon',
    files,
    report,
    components,
    buildAddon,
  );

  return { trucks, components, report };
}

function processComponentTab<Cols extends ColumnMappings & { name: string }>(
  input: { path: string; sourceId: string; columns: Cols } | undefined,
  kind: string,
  files: ReadonlyMap<string, ImportFile>,
  report: NormalizationReport,
  components: Component[],
  build: (
    merged: MergedCandidate,
    file: string,
    sourceId: string,
    columns: Cols,
    inconsistencies: NormalizationReport['inconsistencies'],
  ) => { component: Component; fields: Record<string, FieldDisposition> },
): void {
  if (input === undefined) return;
  const file = requireFile(files, input.path);
  const dataRows = readTabRows(file, input.path, input.columns, report);
  const candidates = buildCandidates(
    input.path,
    input.columns,
    input.columns.name,
    dataRows,
    report,
    kind,
  );
  for (const merged of mergeCandidates(candidates)) {
    const built = build(
      merged,
      input.path,
      input.sourceId,
      input.columns,
      report.inconsistencies,
    );
    components.push(built.component);
    report.entities.components.push({
      id: built.component.id,
      kind,
      row: merged.firstLine,
      fields: built.fields,
    });
  }
}
