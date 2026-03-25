// managed-by: activ8-ai-context-pack | pack-version: 1.2.0
// source-sha: a0d4785
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

function nowCtParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function timestampCt() {
  const p = nowCtParts();
  return `${p.year}${p.month}${p.day}_${p.hour}${p.minute}${p.second}_CT`;
}

function dateCt() {
  const p = nowCtParts();
  return `${p.year}-${p.month}-${p.day}`;
}

function labelCt() {
  const p = nowCtParts();
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} CT`;
}

function sanitizeSegment(value) {
  return (
    String(value || "unknown")
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown"
  );
}

function maybeReadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function uniqueFileName({ timestampCtValue, requestId, finishedAtMs, recordsDir }) {
  const suffix = sanitizeSegment(requestId || `${finishedAtMs}-${randomUUID().slice(0, 8)}`);
  const candidate = `${timestampCtValue}__${suffix}.json`;
  if (!existsSync(join(recordsDir, candidate))) {
    return candidate;
  }
  return `${timestampCtValue}__${suffix}_${randomUUID().slice(0, 6)}.json`;
}

export function persistRecurrenceRecord({
  repoRoot = process.cwd(),
  actionId,
  requestId = null,
  startedAtMs = Date.now(),
  finishedAtMs = Date.now(),
  evidence = {},
  artifacts = {},
  metadata = {},
  ...recurrence
}) {
  const baseDir = join(repoRoot, "artifacts", "action-persistence", "recurrence");
  const recordsDir = join(baseDir, "records", sanitizeSegment(actionId));
  const latestDir = join(baseDir, "latest");
  const ledgerDir = join(baseDir, "ledger");
  mkdirSync(recordsDir, { recursive: true });
  mkdirSync(latestDir, { recursive: true });
  mkdirSync(ledgerDir, { recursive: true });

  const ts = timestampCt();
  const day = dateCt();
  const latestPath = join(latestDir, `latest__${sanitizeSegment(actionId)}.json`);
  const previousLatest = maybeReadJson(latestPath);
  const payload = {
    schema_version: "recurrence_control_v1",
    action_id: actionId,
    request_id: requestId,
    timestamp_ct: ts,
    generated_at_ct: labelCt(),
    started_at_utc: new Date(startedAtMs).toISOString(),
    finished_at_utc: new Date(finishedAtMs).toISOString(),
    duration_ms: Math.max(0, finishedAtMs - startedAtMs),
    recurrence,
    evidence,
    artifacts,
    metadata,
  };

  const timestampedPath = join(
    recordsDir,
    uniqueFileName({
      timestampCtValue: ts,
      requestId,
      finishedAtMs,
      recordsDir,
    })
  );
  const ledgerPath = join(ledgerDir, `${day}.jsonl`);

  writeFileSync(timestampedPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  writeFileSync(latestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  appendFileSync(ledgerPath, `${JSON.stringify(payload)}\n`, "utf-8");

  return {
    ...payload,
    persistence: {
      timestamped_path: timestampedPath,
      latest_path: latestPath,
      ledger_path: ledgerPath,
      previous_latest: previousLatest,
    },
  };
}

export function safePersistRecurrenceRecord(params) {
  try {
    return persistRecurrenceRecord(params);
  } catch (error) {
    console.error(
      `[recurrence-control] failed for ${params?.actionId || "unknown"}: ${
        error?.message || String(error)
      }`
    );
    return null;
  }
}
