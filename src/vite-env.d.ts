/**
 * Globals the build defines (vite.config.ts `define`). Read them through
 * src/build-info.ts, which falls back when a tool runs the source without
 * the define.
 */
/** Which build this is: package.json's version and the commit's short SHA ("dev" outside git). No build time, so a rebuild of one commit is byte-identical. */
declare const __ORBITLAB_BUILD__: { readonly version: string; readonly commit: string };
