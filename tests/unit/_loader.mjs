import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith("@/")) spec = pathToFileURL(path.join(root, "src", spec.slice(2))).href;
  if ((spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("file:")) && !/\.[a-z]+$/i.test(spec)) {
    const base = spec.startsWith("file:") ? fileURLToPath(spec) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), spec);
    for (const ext of [".ts", ".tsx", ".mjs", ".js"]) if (existsSync(base + ext)) { spec = pathToFileURL(base + ext).href; break; }
  }
  if (spec === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  return next(spec, context);
}
