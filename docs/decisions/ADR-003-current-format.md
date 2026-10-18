# ADR-003: One current format within 0.4.0

[English](ADR-003-current-format.md) | [日本語](ADR-003-current-format.ja.md)

Status: implementation decision requested by the session owner. It does not adopt a cognitive hypothesis.

Use one current representation per record type: scene 3, observation 3, percept 2, trace 4, execution envelope 2, snapshot/history 2 and session envelope 2. Keep the application version at 0.4.0. These identifiers describe different record types, not selectable product generations. Do not add another generation for an unfinished change within this release.

Differences in sensing, kinematic versus motor simulation, and receiver-deliberation hypotheses are explicit settings or available evidence in the same format. Cognition must not choose its behavior by an observation-format version. All newly produced traces have the same shape contract and model revision; optional situation, deliberation and motor detail reflect actual capabilities and inputs.

Historical records remain immutable evidence. Read/import adapters convert copies to the current representation, without adding observations, changing observation times, approving a model, or replacing recorded results with recomputed results. Keep the original bytes and recorded hashes for provenance. An archived result is not a result of the current engine. Unsupported or ambiguous historical input must fail rather than invent missing evidence.

Normal writers, examples and schemas use only the current representation. Old-version handling belongs in import adapters, not parallel cognition, rendering or export implementations. Research alternatives remain settings, including a baseline receiver policy; do not describe this as a separate legacy product.

Validate canonical output, preservation of input evidence, historical import, identical behavior where only representation changes, rejection of unknown versions/fields, and browser capture/restore. Private session originals and unrelated working changes must survive this work.

Motor scenes require oriented sensing and body-relative ball placement. Reject incompatible combinations before execution; no format-number fallback may silently select a different capability.
