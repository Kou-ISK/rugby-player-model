# Provenance and license decision pending

## Inputs and retrieval status

The work was scoped from an authorized research brief with separate A/B deliverables. The referenced planning document v4 takes precedence over the earlier design v1, but the bodies of those documents were not available to this executor. The current Library procedure resolved their metadata and the procedural kit metadata. Byte materialization failed for all three files, including one bounded retry through the same authorized route. No alternate signed URL or permission bypass was used. The unavailable input text, private identifiers, logs and internal paths are not reproduced here.

Expected rendering source: user-authored P2P commit `51e4b9d64f5b0e728e22fe74071a582eafccad32`, procedural `models.ts`, minimal `ContactPose` type and provenance, supplied as a kit. Expected ZIP SHA256:

```text
0b24168eb6874b1bb2cacaea5b5926346050ac4baa5acebf32a31b6bcefa07bd
```

**Not verified:** the kit bytes were not obtained; the expected hash is a specification, not a successful checksum result. No P2P source or third-party asset was copied into this change. `src/ui/models.ts` is an independently authored temporary fallback using Three.js primitives. Its comments explicitly record this distinction.

When the owner makes the kit available through an authorized readable route, check that checksum, inspect the archive paths and original notices, retain the unmodified source with provenance, and adapt it only at the rendering boundary. Do not import its compiler, BoardDocument, auth, storage or GLB stack, and do not force research-domain contracts to fit a legacy rendering type. Re-run the visual and information-boundary tests. Original source remains under its original license unless its owner explicitly decides otherwise.

## Current status

`package.json` is `private: true`, `license: UNLICENSED`. No OSS license has been selected. A public repository is not itself an open-source license grant. The prior P2P `UNLICENSED` status must not be changed to MIT by this implementation. Permission to reuse the user's own specified procedural code is not permission to relicense unrelated code or assets.

No images, GLBs, logos, textures, scraped data or other externally owned visual assets are bundled. Dependency licenses remain those of their respective packages; they are not changed by this repository. Legal/rule references are links and concise paraphrases, not copied rulebooks. Research plans and local user sessions are not public artifacts.

The detailed inclusion/exclusion matrix is in [PUBLICATION_SCOPE.md](PUBLICATION_SCOPE.md). [MODEL_CARD.md](MODEL_CARD.md), [DATA_CARD.md](DATA_CARD.md) and the [reproduction manifest](../research/reproducibility-manifest.json) record intended use, synthetic-data provenance, version identities and the limits of current evidence. None of these documents adopts a license or declares the missing P2P/Mac work complete.

## Recommendation for the owner's later decision

| Material | Proposed option, not yet applied | Reason / condition |
| --- | --- | --- |
| Newly authored research and bridge code | [MIT](https://opensource.org/license/mit), if the owner wants broad reuse | Simple for experimentation and downstream integration. Apply only after ownership/contributor review. Keep imported P2P notices separate unless the owner explicitly relicenses that code too. |
| Authored principle/architecture documentation | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Supports reuse with credit and adapted versions. Exclude private plans, personal sessions and third-party quotations. |
| Wholly synthetic scene fixtures | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), or MIT if one-license simplicity is preferred | Minimizes friction for reproducible tests; only apply to authored synthetic values, not future athlete/match datasets. |
| Private feedback, future human/match data | No blanket public license | Decide consent, rights and publishing scope per dataset before release. |

These are project governance proposals, not a license adoption or legal conclusion. Until the owner decides, retain UNLICENSED and describe this as a research foundation with pending licensing, not a licensed OSS release.
