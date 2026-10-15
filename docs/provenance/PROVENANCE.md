# Provenance and authorized publication

[English](PROVENANCE.md) | [日本語](PROVENANCE.ja.md)

## Verified inputs

The authorized planning document v4 and procedural kit were materialized on the owner's Mac through the Library prepare/materialize route. The full plan and ZIP remain outside Git. Public requirements preserve independent deliverables, local owner review, observation/truth separation and rendering-only reuse. No paid model or API was connected.

The kit identifies P2P commit `51e4b9d64f5b0e728e22fe74071a582eafccad32`, original `src/web/three/models.ts`, Git blob `ea0174e38b2c23ebca6804a1062d4be9c3c23415`. The blob and each kit file's size/hash were independently checked locally. The source repository was not recloned for a new commit-membership proof.

- ZIP SHA256: `0b24168eb6874b1bb2cacaea5b5926346050ac4baa5acebf32a31b6bcefa07bd`.
- `models.ts` SHA256: `07b7965746b80d1cb222b5e13254369a257620bc42781a95821e23b550226d86`.

Current byte-preserved sources are under `tools/workbench/src/rendering/vendor/phrase2play/`; `tools/workbench/src/rendering/models.ts` is the adapter. The [reuse notice](../../tools/workbench/src/rendering/vendor/phrase2play/REUSE-NOTICE.md) and [kit manifest](../../tools/workbench/src/rendering/vendor/phrase2play/kit-manifest.json) retain handoff evidence. No GLB, truth-aware camera, P2P engine/core types, Auth, Blob, match data or unrelated source was imported. Three.js remains a separately licensed dependency.

## Publication and license chronology

On 2026-10-12 the owner authorized public release of reviewed RPM code, authored synthetic fixtures and documentation, including the bounded procedural source and minimal pose type. Dynamic implementation through `9467c34` and stable setup through `7fa228c` had independent review. This is a scope summary, not a publication of the private authorization conversation.

The two extracted code files remain byte-identical. Original notices and the historical kit manifest remain intact; its `published: false` describes the original handoff. Subsequent limited MIT permission is defined by [LICENSE-SCOPE](../../LICENSE-SCOPE.md) and [LICENSE](../../LICENSE). It covers the listed authored files and two bounded renderer files, not the entire P2P repository or its other assets. Historical UNLICENSED statements record their earlier context and are not rewritten.

Packages remain `private: true` to avoid accidental npm publication. Dependencies retain their own licenses. No external visual assets, real-player data, private plans or sessions are part of the grant. Referenced papers/laws are links and short paraphrases, not copied corpora.

See [publication scope](PUBLICATION_SCOPE.md), [model card](../../models/player/MODEL_CARD.md), [data card](../../evaluation/DATA_CARD.md) and [reproduction manifest](../../reproducibility.json). Integrity checks, publication permission and licensing do not establish human validity, owner screen acceptance or adoption of a research candidate.
