#!/usr/bin/env node
// Guard against accidentally committing local research datasets or game archives.
// This is a repository hygiene check, not a rights-clearance or bundle audit.
import { execFileSync } from 'node:child_process';

const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenPrefixes = [
  'data/raw/',
  'data/normalized/',
  'data/reports/',
  'packages/game-data/generated/',
];
const forbiddenExtensions = /\.(?:pak|zip|7z)$/i;
const violations = paths.filter(
  (path) =>
    forbiddenPrefixes.some((prefix) => path.startsWith(prefix)) ||
    forbiddenExtensions.test(path),
);

if (violations.length > 0) {
  console.error('Forbidden tracked research artifacts:\n' + violations.map((path) => '  - ' + path).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Data boundary check passed: no forbidden research paths or archives tracked.');
}
