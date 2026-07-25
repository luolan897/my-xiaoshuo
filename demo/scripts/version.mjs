import { readFile } from "node:fs/promises";

const mainPackageUrl = new URL("../../package.json", import.meta.url);

export async function readMainVersion() {
  const packageJson = JSON.parse(await readFile(mainPackageUrl, "utf8"));
  const version = String(packageJson.version ?? "").trim();
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) throw new Error("Main package version is invalid.");
  return version;
}

export function versionModuleSource(version) {
  return `export const DEMO_VERSION = ${JSON.stringify(version)};\n`;
}
