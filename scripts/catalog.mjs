import { createPrivateKey } from "node:crypto";
import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
  writeFileSync,
} from "node:fs";
import { parseArgs } from "node:util";
import {
  MAX_CATALOG_BYTES,
  searchCatalog,
  signCatalog,
  verifyCatalog,
} from "../src/catalog.mjs";

function readBoundedFile(path, maximum, label) {
  const handle = openSync(path, "r");
  try {
    const file = fstatSync(handle);
    if (!file.isFile() || file.size > maximum)
      throw new Error(`Invalid ${label} size or file type`);
    const bytes = Buffer.alloc(maximum + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(
        handle,
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (count === 0) return bytes.subarray(0, offset);
      offset += count;
    }
    throw new Error(`Invalid ${label} size or file type`);
  } finally {
    closeSync(handle);
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  const { values } = parseArgs({
    args,
    options: {
      catalog: { type: "string" },
      signature: { type: "string" },
      "private-key": { type: "string" },
      "public-key": { type: "string" },
      "catalog-id": { type: "string" },
      checkpoint: { type: "string" },
      text: { type: "string" },
      "host-protocol": { type: "string" },
      runtime: { type: "string" },
      prerelease: { type: "boolean" },
    },
  });
  if (!values.catalog || !values.signature)
    throw new Error("Supply --catalog and --signature");
  const bytes = readBoundedFile(values.catalog, MAX_CATALOG_BYTES, "catalog");
  if (command === "sign" && values["private-key"]) {
    const key = createPrivateKey(
      readBoundedFile(values["private-key"], 16 * 1024, "private key"),
    );
    const signature = signCatalog(bytes, key);
    writeFileSync(values.signature, signature + "\n", { flag: "wx" });
  } else if (
    command === "search" &&
    values["public-key"] &&
    values["catalog-id"]
  ) {
    const verified = verifyCatalog(
      bytes,
      readBoundedFile(values.signature, 256, "signature")
        .toString("utf8")
        .trimEnd(),
      {
        catalogId: values["catalog-id"],
        publicKey: values["public-key"],
        checkpoint: values.checkpoint
          ? JSON.parse(
              readBoundedFile(values.checkpoint, 1024, "checkpoint").toString(
                "utf8",
              ),
            )
          : undefined,
      },
    );
    const packages = searchCatalog(verified.catalog, {
      text: values.text,
      hostProtocolVersion: values["host-protocol"],
      runtimeRef: values.runtime,
      includePrerelease: values.prerelease,
    });
    console.log(
      JSON.stringify({ checkpoint: verified.checkpoint, packages }, null, 2),
    );
  } else {
    throw new Error(
      "Use sign with --private-key or search with --catalog-id and --public-key",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
