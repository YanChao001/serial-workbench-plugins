import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { searchCatalog, signCatalog, verifyCatalog } from "../src/catalog.mjs";

const now = Date.parse("2026-11-24T12:00:00.000Z");
const publisher = generateKeyPairSync("ed25519");
const publicHex = (key) =>
  key.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
const trust = {
  catalogId: "swb.market.testing",
  publicKey: publicHex(publisher.publicKey),
  now,
};
const packageKey = Buffer.from(
  publicHex(generateKeyPairSync("ed25519").publicKey),
  "hex",
);
const released = "2026-11-23T00:00:00.000Z";
const encode = (document) => Buffer.from(JSON.stringify(document));

function release(version, runtimeRef = "node-26.13.0") {
  return {
    version,
    hostProtocolVersion: "0.1",
    runtimeRef,
    publishedAt: released,
    archive: {
      url: `https://plugins.example.org/statistics/${version}/package.zip`,
      sha256: "a".repeat(64),
      bytes: 123,
    },
    sourceApproval: {
      source: "statistics",
      keyId: "fixture-1",
      publicKey: [...packageKey],
      publicKeySha256: createHash("sha256").update(packageKey).digest("hex"),
    },
  };
}

function catalog() {
  return {
    schemaVersion: 1,
    catalogId: trust.catalogId,
    sequence: "9007199254740995",
    publishedAt: "2026-11-24T00:00:00.000Z",
    expiresAt: "2026-12-24T00:00:00.000Z",
    packages: [
      {
        id: "swb.reference.statistics",
        name: "Sample Statistics",
        description: "统计窗口与缺样",
        license: "Apache-2.0",
        tags: ["chart", "分析"],
        releases: [
          release("1.9.0"),
          release("2.0.0-beta.2"),
          release("1.10.0"),
          release("2.0.0-beta.10"),
          release("3.0.0", "node-27.0.0"),
        ],
        rating: {
          score: 4.25,
          count: 12,
          observedAt: released,
          discussionUrl: "https://github.com/example/plugins/discussions/1",
        },
      },
    ],
  };
}

function validate(document, options = trust) {
  const bytes = encode(document);
  return verifyCatalog(
    bytes,
    signCatalog(bytes, publisher.privateKey),
    options,
  );
}

test("verified search preserves discussion and package provenance and sorts compatible releases", () => {
  const { catalog: document, checkpoint } = validate(catalog());
  assert.equal(checkpoint.sequence, document.sequence);
  const filters = {
    text: "ＳＴＡＴＩＳＴＩＣＳ 分析",
    hostProtocolVersion: "0.1",
    runtimeRef: "node-26.13.0",
  };
  const [match] = searchCatalog(document, filters);
  assert.deepEqual(
    match.releases.map(({ version }) => version),
    ["1.10.0", "1.9.0"],
  );
  assert.deepEqual(match.rating, document.packages[0].rating);
  assert.deepEqual(
    match.releases[0].sourceApproval,
    release("1.10.0").sourceApproval,
  );
  assert.deepEqual(
    searchCatalog(document, {
      ...filters,
      includePrerelease: true,
    })[0].releases.map(({ version }) => version),
    ["2.0.0-beta.10", "2.0.0-beta.2", "1.10.0", "1.9.0"],
  );
  assert.deepEqual(
    searchCatalog(document, { ...filters, text: "no such match" }),
    [],
  );
});

test("a catalog pin rejects byte changes, a foreign key and a foreign identity", () => {
  const document = catalog();
  const bytes = encode(document);
  const signature = signCatalog(bytes, publisher.privateKey);
  assert.throws(
    () =>
      verifyCatalog(
        Buffer.concat([bytes, Buffer.from("\n")]),
        signature,
        trust,
      ),
    /signature does not match/,
  );
  assert.throws(
    () =>
      verifyCatalog(bytes, signature, {
        ...trust,
        publicKey: publicHex(generateKeyPairSync("ed25519").publicKey),
      }),
    /signature does not match/,
  );
  assert.throws(
    () =>
      verifyCatalog(bytes, signature, {
        ...trust,
        catalogId: "swb.market.other",
      }),
    /catalog identity/,
  );
  assert.throws(
    () =>
      verifyCatalog(bytes, signature, {
        ...trust,
        now: Date.parse(document.expiresAt),
      }),
    /validity period/,
  );
});

test("an existing checkpoint accepts the same bytes and rejects reissued or older sequences", () => {
  const document = catalog();
  const { checkpoint } = validate(document);
  const pinned = { ...trust, checkpoint };
  assert.deepEqual(validate(document, pinned).checkpoint, checkpoint);
  assert.throws(
    () => validate(document, { ...trust, checkpoint: null }),
    /checkpoint/,
  );
  assert.throws(
    () => validate({ ...document, sequence: "9007199254740994" }, pinned),
    /rolled back/,
  );
  assert.throws(
    () => validate({ ...document, packages: [] }, pinned),
    /changed at an existing sequence/,
  );
  assert.equal(
    validate({ ...document, sequence: "9007199254740996" }, pinned).checkpoint
      .sequence,
    "9007199254740996",
  );
});

test("signing rejects malformed or ambiguous release evidence", () => {
  function reject(change, expected) {
    const document = catalog();
    change(document.packages[0]);
    assert.throws(
      () => signCatalog(encode(document), publisher.privateKey),
      expected,
    );
  }
  reject(
    (pkg) => pkg.releases.push(release("1.9.0+another")),
    /duplicate release version precedence/,
  );
  reject((pkg) => {
    pkg.releases[0].version = "1.2.3-01";
  }, /release.version/);
  reject((pkg) => {
    pkg.releases[0].publishedAt = "-000001-01-01T00:00:00.000Z";
  }, /release.publishedAt/);
  reject((pkg) => {
    pkg.releases[0].archive.url = "http://plugins.example.org/package.zip";
  }, /archive.url/);
  reject((pkg) => {
    pkg.releases[0].sourceApproval.source = "swb.product";
  }, /sourceApproval.source/);
  reject((pkg) => {
    pkg.releases[0].sourceApproval.publicKey[0] ^= 1;
  }, /sourceApproval.publicKey/);
});

test("the command signs a catalog and searches it using its out-of-band trust pin", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "swb-market-cli-"));
  const files = Object.fromEntries(
    ["catalog.json", "catalog.sig", "publisher.pem", "checkpoint.json"].map(
      (name) => [name, join(directory, name)],
    ),
  );
  t.after(() => {
    for (const path of Object.values(files)) rmSync(path, { force: true });
    rmdirSync(directory);
  });
  const document = catalog();
  document.publishedAt = new Date(Date.now() - 60_000).toISOString();
  document.expiresAt = new Date(Date.now() + 60_000).toISOString();
  for (const row of document.packages[0].releases)
    row.publishedAt = document.publishedAt;
  document.packages[0].rating.observedAt = document.publishedAt;
  writeFileSync(files["catalog.json"], encode(document));
  writeFileSync(
    files["publisher.pem"],
    publisher.privateKey.export({ format: "pem", type: "pkcs8" }),
  );
  const tool = fileURLToPath(
    new URL("../scripts/catalog.mjs", import.meta.url),
  );
  const run = (command, ...options) =>
    spawnSync(
      process.execPath,
      [
        tool,
        command,
        "--catalog",
        files["catalog.json"],
        "--signature",
        files["catalog.sig"],
        ...options,
      ],
      { encoding: "utf8" },
    );
  const sign = run("sign", "--private-key", files["publisher.pem"]);
  assert.equal(sign.status, 0, sign.stderr);
  assert.equal(run("sign", "--private-key", files["publisher.pem"]).status, 1);
  const args = [
    "--public-key",
    trust.publicKey,
    "--catalog-id",
    trust.catalogId,
    "--runtime",
    "node-26.13.0",
    "--text",
    "sample",
  ];
  const search = run("search", ...args);
  assert.equal(search.status, 0, search.stderr);
  const result = JSON.parse(search.stdout);
  assert.equal(result.packages[0].releases[0].version, "1.10.0");
  writeFileSync(files["checkpoint.json"], JSON.stringify(result.checkpoint));
  const repeated = run(
    "search",
    ...args,
    "--checkpoint",
    files["checkpoint.json"],
  );
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout), result);
  writeFileSync(files["catalog.json"], Buffer.alloc(1024 * 1024 + 1));
  const oversized = run("search", ...args);
  assert.equal(oversized.status, 1);
  assert.match(oversized.stderr, /Invalid catalog size or file type/);
});
