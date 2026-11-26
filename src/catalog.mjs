import { createHash, createPublicKey, sign, verify } from "node:crypto";

export const MAX_CATALOG_BYTES = 1024 * 1024;

const signatureDomain = "serial-workbench-market-catalog-v1\n";
const maximumU64 = (1n << 64n) - 1n;
const positiveDecimal = /^[1-9][0-9]{0,19}$/;
const digestPattern = /^[0-9a-f]{64}$/;
const packageId = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/;
const hostProtocol = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const token = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const decimal = /^(0|[1-9][0-9]*)$/;
const semver =
  /^(0|[1-9][0-9]{0,19})\.(0|[1-9][0-9]{0,19})\.(0|[1-9][0-9]{0,19})(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function version(value) {
  const match = typeof value === "string" && semver.exec(value);
  if (!match) return;
  const numbers = match.slice(1, 4).map(BigInt);
  const prerelease = match[4]?.split(".") ?? [];
  if (
    numbers.some((part) => part > maximumU64) ||
    prerelease.some((part) => /^[0-9]+$/.test(part) && !decimal.test(part))
  )
    return;
  return { numbers, prerelease };
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareVersions(left, right) {
  const a = version(left);
  const b = version(right);
  for (const [i, part] of a.numbers.entries()) {
    const order = compare(part, b.numbers[i]);
    if (order) return order;
  }
  const before = a.prerelease;
  const after = b.prerelease;
  if (!before.length || !after.length)
    return compare(!before.length, !after.length);
  for (const [i, part] of before.entries()) {
    const other = after[i];
    if (other === undefined) return 1;
    const numeric = decimal.test(part);
    const otherNumeric = decimal.test(other);
    const order =
      numeric === otherNumeric
        ? (numeric ? compare(part.length, other.length) : 0) ||
          compare(part, other)
        : numeric
          ? -1
          : 1;
    if (order) return order;
  }
  return compare(before.length, after.length);
}

function requireValue(ok, path) {
  if (!ok) throw new Error(`Invalid market catalog field: ${path}`);
}

function object(value, path, required, optional = []) {
  requireValue(
    value && typeof value === "object" && !Array.isArray(value),
    path,
  );
  const keys = Object.keys(value);
  requireValue(
    required.every((key) => Object.hasOwn(value, key)) &&
      keys.every((key) => required.includes(key) || optional.includes(key)),
    path,
  );
}

function checkedText(value, path, max, pattern) {
  requireValue(
    typeof value === "string" &&
      value.length > 0 &&
      value.length <= max &&
      value === value.trim() &&
      (!pattern || pattern.test(value)),
    path,
  );
}

function sequence(value, path) {
  checkedText(value, path, 20, positiveDecimal);
  const number = BigInt(value);
  requireValue(number <= maximumU64, path);
  return number;
}

function timestamp(value, path) {
  const date = typeof value === "string" ? new Date(value) : null;
  requireValue(
    date &&
      value.length === 24 &&
      Number.isFinite(date.valueOf()) &&
      date.toISOString() === value,
    path,
  );
  return date.valueOf();
}

function https(value, path) {
  const url = typeof value === "string" ? URL.parse(value) : null;
  requireValue(
    url?.protocol === "https:" &&
      url.href === value &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    path,
  );
}

function release(value) {
  object(value, "release", [
    "version",
    "hostProtocolVersion",
    "runtimeRef",
    "publishedAt",
    "archive",
    "sourceApproval",
  ]);
  requireValue(version(value.version), "release.version");
  checkedText(
    value.hostProtocolVersion,
    "release.hostProtocolVersion",
    41,
    hostProtocol,
  );
  checkedText(value.runtimeRef, "release.runtimeRef", 128, token);
  timestamp(value.publishedAt, "release.publishedAt");
  const { archive, sourceApproval: source } = value;
  object(archive, "release.archive", ["url", "sha256", "bytes"]);
  https(archive.url, "release.archive.url");
  checkedText(archive.sha256, "release.archive.sha256", 64, digestPattern);
  requireValue(
    Number.isInteger(archive.bytes) &&
      archive.bytes > 0 &&
      archive.bytes <= 256 * 1024 * 1024,
    "release.archive.bytes",
  );
  object(source, "release.sourceApproval", [
    "source",
    "keyId",
    "publicKey",
    "publicKeySha256",
  ]);
  checkedText(source.source, "release.sourceApproval.source", 128, token);
  requireValue(
    source.source !== "swb.product",
    "release.sourceApproval.source",
  );
  checkedText(source.keyId, "release.sourceApproval.keyId", 128, token);
  requireValue(
    Array.isArray(source.publicKey) &&
      source.publicKey.length === 32 &&
      source.publicKey.every(
        (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
      ) &&
      sha256(Buffer.from(source.publicKey)) === source.publicKeySha256,
    "release.sourceApproval.publicKey",
  );
}

function review(value, publishedAt) {
  object(value, "rating", ["score", "count", "observedAt", "discussionUrl"]);
  requireValue(
    Number.isFinite(value.score) && value.score >= 0 && value.score <= 5,
    "rating.score",
  );
  requireValue(
    Number.isSafeInteger(value.count) && value.count > 0,
    "rating.count",
  );
  const observedAt = timestamp(value.observedAt, "rating.observedAt");
  requireValue(observedAt <= publishedAt, "rating.observedAt");
  https(value.discussionUrl, "rating.discussionUrl");
}

function catalogSnapshot(bytes) {
  requireValue(
    bytes instanceof Uint8Array &&
      bytes.length > 0 &&
      bytes.length <= MAX_CATALOG_BYTES,
    "catalog bytes",
  );
  return Buffer.from(bytes);
}

function parseCatalog(bytes) {
  const catalog = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  object(catalog, "catalog", [
    "schemaVersion",
    "catalogId",
    "sequence",
    "publishedAt",
    "expiresAt",
    "packages",
  ]);
  requireValue(catalog.schemaVersion === 1, "schemaVersion");
  checkedText(catalog.catalogId, "catalogId", 128, packageId);
  sequence(catalog.sequence, "sequence");
  const publishedAt = timestamp(catalog.publishedAt, "publishedAt");
  requireValue(
    timestamp(catalog.expiresAt, "expiresAt") > publishedAt,
    "expiresAt",
  );
  requireValue(Array.isArray(catalog.packages), "packages");
  const ids = new Set();
  for (const pkg of catalog.packages) {
    object(
      pkg,
      "package",
      ["id", "name", "description", "license", "tags", "releases"],
      ["rating"],
    );
    checkedText(pkg.id, "package.id", 128, packageId);
    requireValue(!ids.has(pkg.id), "duplicate package.id");
    ids.add(pkg.id);
    checkedText(pkg.name, "package.name", 128);
    checkedText(pkg.description, "package.description", 1024);
    checkedText(pkg.license, "package.license", 128);
    requireValue(
      Array.isArray(pkg.tags) && new Set(pkg.tags).size === pkg.tags.length,
      "package.tags",
    );
    for (const tag of pkg.tags) checkedText(tag, "package.tag", 64);
    requireValue(
      Array.isArray(pkg.releases) && pkg.releases.length > 0,
      "package.releases",
    );
    const versions = new Set();
    for (const row of pkg.releases) {
      release(row);
      requireValue(
        Date.parse(row.publishedAt) <= publishedAt,
        "release.publishedAt",
      );
      const precedence = row.version.split("+")[0];
      requireValue(
        !versions.has(precedence),
        "duplicate release version precedence",
      );
      versions.add(precedence);
    }
    if (Object.hasOwn(pkg, "rating")) review(pkg.rating, publishedAt);
  }
  return catalog;
}

function message(bytes) {
  return Buffer.concat([Buffer.from(signatureDomain), bytes]);
}

export function signCatalog(input, privateKey) {
  const bytes = catalogSnapshot(input);
  parseCatalog(bytes);
  requireValue(
    privateKey?.type === "private" &&
      privateKey.asymmetricKeyType === "ed25519",
    "private key type",
  );
  return sign(null, message(bytes), privateKey).toString("base64");
}

export function verifyCatalog(
  input,
  signature,
  { catalogId, publicKey, checkpoint, now = Date.now() },
) {
  const bytes = catalogSnapshot(input);
  checkedText(publicKey, "trusted catalog public key", 64, digestPattern);
  requireValue(
    typeof signature === "string" && /^[A-Za-z0-9+/]{86}==$/.test(signature),
    "catalog signature",
  );
  const proof = Buffer.from(signature, "base64");
  requireValue(
    proof.length === 64 && proof.toString("base64") === signature,
    "catalog signature",
  );
  const key = createPublicKey({
    key: {
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(publicKey, "hex").toString("base64url"),
    },
    format: "jwk",
  });
  if (!verify(null, message(bytes), key, proof))
    throw new Error("Market catalog signature does not match its trusted key");
  const catalog = parseCatalog(bytes);
  requireValue(catalog.catalogId === catalogId, "catalog identity");
  requireValue(
    Number.isFinite(now) &&
      Date.parse(catalog.publishedAt) <= now &&
      now < Date.parse(catalog.expiresAt),
    "catalog validity period",
  );
  const digest = sha256(bytes);
  if (checkpoint !== undefined) {
    object(checkpoint, "checkpoint", ["digest", "sequence"]);
    checkedText(checkpoint.digest, "checkpoint digest", 64, digestPattern);
    const previous = sequence(checkpoint.sequence, "checkpoint sequence");
    const current = BigInt(catalog.sequence);
    if (
      current < previous ||
      (current === previous && checkpoint.digest !== digest)
    )
      throw new Error(
        "Market catalog has been rolled back or changed at an existing sequence",
      );
  }
  return { catalog, checkpoint: { sequence: catalog.sequence, digest } };
}

export function searchCatalog(
  catalog,
  {
    text = "",
    hostProtocolVersion,
    runtimeRef,
    includePrerelease = false,
  } = {},
) {
  const normalize = (value) => value.normalize("NFKC").toLowerCase();
  const terms = normalize(text).trim().split(/\s+/).filter(Boolean);
  return catalog.packages
    .flatMap((pkg) => {
      const searchable = normalize(
        [pkg.id, pkg.name, pkg.description, ...pkg.tags].join(" "),
      );
      if (!terms.every((term) => searchable.includes(term))) return [];
      const releases = pkg.releases.filter(
        (row) =>
          (hostProtocolVersion === undefined ||
            row.hostProtocolVersion === hostProtocolVersion) &&
          (runtimeRef === undefined || row.runtimeRef === runtimeRef) &&
          (includePrerelease || !version(row.version).prerelease.length),
      );
      if (!releases.length) return [];
      releases.sort((a, b) => compareVersions(b.version, a.version));
      return [{ ...pkg, releases }];
    })
    .sort((a, b) => compare(a.id, b.id));
}
