// Consente a node:test di importare i moduli TypeScript del progetto (import senza estensione, alias @/).
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./_loader.mjs", pathToFileURL(import.meta.filename));
