import { promises as fs } from 'node:fs';
import path from 'node:path';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH_MS_PATTERN = /_(\d{13})(?=\.[^.]+$)/;

function asLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateFromName(fileName: string): Date | null {
  const match = fileName.match(EPOCH_MS_PATTERN);
  if (!match) {
    return null;
  }

  const epochMs = Number.parseInt(match[1], 10);
  if (Number.isNaN(epochMs)) {
    return null;
  }

  return new Date(epochMs);
}

function bucketName(fileDate: Date, now: Date): string {
  const fileDay = asLocalMidnight(fileDate).getTime();
  const nowDay = asLocalMidnight(now).getTime();
  const daysDiff = Math.floor((nowDay - fileDay) / ONE_DAY_MS);

  if (daysDiff === 0) return 'today';
  if (daysDiff === 1) return 'yesterday';

  const yyyy = fileDate.getFullYear();
  const mm = String(fileDate.getMonth() + 1).padStart(2, '0');
  const dd = String(fileDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function moveFileWithRename(source: string, targetDir: string): Promise<string> {
  const parsed = path.parse(source);
  let target = path.join(targetDir, parsed.base);
  let counter = 1;

  while (true) {
    try {
      await fs.access(target);
      target = path.join(targetDir, `${parsed.name}-${counter}${parsed.ext}`);
      counter += 1;
    } catch {
      break;
    }
  }

  await fs.rename(source, target);
  return target;
}

async function arrangeDatasetByDate(rootDir: string): Promise<void> {
  const now = new Date();
  const absoluteRoot = path.resolve(process.cwd(), rootDir);
  const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const sourcePath = path.join(absoluteRoot, entry.name);
    const stat = await fs.stat(sourcePath);
    const detectedDate = getDateFromName(entry.name) ?? stat.mtime;
    const bucket = bucketName(detectedDate, now);
    const destinationDir = path.join(absoluteRoot, bucket);

    await ensureDir(destinationDir);
    const destinationPath = await moveFileWithRename(sourcePath, destinationDir);
    console.log(`${entry.name} -> ${path.relative(absoluteRoot, destinationPath)}`);
  }
}

async function main(): Promise<void> {
  const rootDir = process.argv[2] ?? 'attached_assets';
  await arrangeDatasetByDate(rootDir);
  console.log(`\nDataset arranged in: ${path.resolve(process.cwd(), rootDir)}`);
}

void main();
