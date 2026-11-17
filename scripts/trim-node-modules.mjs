import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(__rootDir, 'node_modules'),
];

let removedFiles = 0;
let reclaimedBytes = 0;

function shouldTrimFile(filePath, fileName) {
  if (fileName.endsWith('.map')) {
    return true;
  }
  if (
    filePath.includes(`${path.sep}@firebase${path.sep}`) &&
    /\.rn\.(js|cjs|mjs|d\.ts)$/.test(fileName)
  ) {
    return true;
  }
  return false;
}

function walkAndTrim(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      walkAndTrim(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!shouldTrimFile(fullPath, entry.name)) continue;

    try {
      const size = fs.statSync(fullPath).size;
      fs.unlinkSync(fullPath);
      removedFiles += 1;
      reclaimedBytes += size;
    } catch {
      // Ignore read-only or race-removed files
    }
  }
}

for (const nmDir of targets) {
  if (fs.existsSync(nmDir)) {
    walkAndTrim(nmDir);
  }
}

if (removedFiles > 0) {
  console.log(
    `[trim-node-modules] Removed ${removedFiles} source-map / RN bundle files (${(
      reclaimedBytes /
      (1024 * 1024)
    ).toFixed(2)} MB reclaimed)`
  );
}
