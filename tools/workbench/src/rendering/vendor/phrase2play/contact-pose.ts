/**
 * RPM handoff-local presentation contract, authored 2026-10-11.
 * Minimal structural shape consumed by the extracted procedural model.
 * This is a visual pose hint, never evidence of successful physical contact,
 * possession, a learned skill, or a cognitive observation.
 * No imports from P2P core, schema, compiler, server, or persisted documents.
 */
export type ContactPose = {
  kind: "pickup" | "carry" | "latch" | "tackle" | "ground" | "over";
  weight: number;
  side: number;
};
