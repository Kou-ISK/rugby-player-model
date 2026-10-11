# Provenance and license decision pending

## Inputs and retrieval status

The authorized planning document v4 and procedural kit were materialized on the owner's Mac through the current Library prepare/materialize helper route. The complete plan and ZIP remain outside Git. The plan confirms independent A/B artifacts, local owner review, observation/truth separation, and rendering-only reuse. No paid model or API was connected.

Verified source: P2P commit `51e4b9d64f5b0e728e22fe74071a582eafccad32`, `src/web/three/models.ts`, Git blob `ea0174e38b2c23ebca6804a1062d4be9c3c23415`. The supplied kit identifies that commit; the blob and every kit file hash/size were independently checked locally. The original source repository was not recloned to establish a new commit-membership proof.

Verified ZIP SHA256: `0b24168eb6874b1bb2cacaea5b5926346050ac4baa5acebf32a31b6bcefa07bd`.
Verified models.ts SHA256: `07b7965746b80d1cb222b5e13254369a257620bc42781a95821e23b550226d86`.

`src/ui/p2p/models.ts` and `contact-pose.ts` preserve the kit bytes. `src/ui/models.ts` is the RPM adapter. Original [reuse notice](../src/ui/p2p/REUSE-NOTICE.md) and [kit manifest](../src/ui/p2p/kit-manifest.json) retain the original scope/rights evidence. No GLB, engine, truth-aware camera, P2P core type, Auth, Blob, match data or other source was imported. The existing pinned Three package remains external; installed `three/LICENSE` retains its own MIT notice (three.js authors), which does not relicense P2P.

**Local review only: do not publicly push this branch before parent review and the owner's publication/license decision for the extracted UNLICENSED source.** User-authorized private reuse does not grant public sublicensing. These display meshes do not verify running, contact or ball-handling skills.

## Current status

`package.json` is `private: true`, `license: UNLICENSED`. No OSS license has been selected. A public repository is not itself an open-source license grant. The prior P2P `UNLICENSED` status must not be changed to MIT by this implementation. Permission to reuse the user's own specified procedural code is not permission to relicense unrelated code or assets.

No images, GLBs, logos, textures, scraped data or other externally owned visual assets are bundled. Dependency licenses remain those of their respective packages; they are not changed by this repository. Legal/rule references are links and concise paraphrases, not copied rulebooks. Research plans and local user sessions are not public artifacts.

The detailed inclusion/exclusion matrix is in [PUBLICATION_SCOPE.md](PUBLICATION_SCOPE.md). [MODEL_CARD.md](MODEL_CARD.md), [DATA_CARD.md](DATA_CARD.md) and the [reproduction manifest](../research/reproducibility-manifest.json) record intended use, synthetic-data provenance, version identities and the limits of current evidence. None of these documents adopts a license or declares owner Mac acceptance complete.

## Recommendation for the owner's later decision

| Material | Proposed option, not yet applied | Reason / condition |
| --- | --- | --- |
| Newly authored research and bridge code | [MIT](https://opensource.org/license/mit), if the owner wants broad reuse | Simple for experimentation and downstream integration. Apply only after ownership/contributor review. Keep imported P2P notices separate unless the owner explicitly relicenses that code too. |
| Authored principle/architecture documentation | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Supports reuse with credit and adapted versions. Exclude private plans, personal sessions and third-party quotations. |
| Wholly synthetic scene fixtures | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), or MIT if one-license simplicity is preferred | Minimizes friction for reproducible tests; only apply to authored synthetic values, not future athlete/match datasets. |
| Private feedback, future human/match data | No blanket public license | Decide consent, rights and publishing scope per dataset before release. |

These are project governance proposals, not a license adoption or legal conclusion. Until the owner decides, retain UNLICENSED and describe this as a research foundation with pending licensing, not a licensed OSS release.
