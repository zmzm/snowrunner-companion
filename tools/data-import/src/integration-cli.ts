import { runIntegrationFiles } from './integration-files';

try {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const config = args[0];
  if (args.length !== 1 || !config)
    throw new Error('Usage: pnpm integrate:catalog -- <local-config.json>');
  const result = runIntegrationFiles(config, process.cwd());
  console.log(
    `Development integration completed: ${result.applied} projections applied, ${result.withheld} withheld. Outputs saved under ignored research directories.`,
  );
} catch {
  // Source content and private paths belong only in local reports, never logs.
  console.error(
    'Development integration failed. Check local input schemas, hashes, references and output-name collisions. No distribution approval.',
  );
  process.exitCode = 1;
}
