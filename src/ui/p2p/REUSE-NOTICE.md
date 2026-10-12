# Reuse evidence and authorized publication

## Publication amendment — 2026-10-12

The owner explicitly authorized public release of RPM's reviewed code, synthetic fixtures and documentation, including the unmodified procedural source in `models.ts` and the minimal kit-authored presentation type in `contact-pose.ts`. The authorization covers these bounded extracted files and their provenance records, not the full private P2P application, GLB/motion assets, credentials, private research sessions or personal information. Independent implementation and stable Mac setup reviews passed.

UNLICENSED remains the declared status. No MIT, Apache, Creative Commons or other new license is adopted, and public availability is not presented as a blanket sublicensing grant. Attribution and the original source/hash evidence below remain in place. The original kit manifest is preserved unchanged as a historical handoff record; its pre-publication flags are superseded only for the public-release scope stated here. See [current RPM publication scope](../../../docs/PUBLICATION_SCOPE.md).

## Original private-handoff record — historical

The following records the restrictions and evidence at kit preparation, before the explicit publication authorization above.

This is a bounded private handoff under the user's explicit permission to reuse P2P display/player-model mechanisms for RPM. It is not permission to publish P2P wholesale, runtime credentials or third-party material.

Pinned source: https://github.com/Kou-ISK/phrase2play/blob/51e4b9d64f5b0e728e22fe74071a582eafccad32/src/web/three/models.ts

The module's own header calls these original procedural display assets and states that no downloaded artwork or models are used. At the same commit, `docs/architecture/decisions/0036-readonly-three-view.md` records that the person, ball, pitch and grass were procedurally authored for the change and contain no external models, images or purchased assets. Inspection found generated geometry/textures and only the Three package plus a local type import. This supports selecting this module as P2P-authored material; it is not an independent audit of every contributor's ownership history.

Source ownership: P2P-authored code according to pinned source and ADR, owned/controlled in the user-authorized repository. Individual contributor authorship and publication license have not been independently resolved here. If implementation review identifies a third-party-origin section or an ownership conflict, quarantine that section and use an RPM-authored interface until resolved.

Source package metadata is `private: true`, `license: UNLICENSED`. Root `THIRD_PARTY_NOTICES.md` says the P2P application and authored patterns are private pending the owner's publication/license decision. Therefore this kit must NOT be relabeled MIT/Apache/CC0 or automatically published merely because RPM is intended as OSS. Before public reuse, record the owner-authorized license for the extracted module, preserved authorship/attribution and scope, then update RPM's provenance record. User reuse authorization and a blanket public sublicensing statement are not treated as identical.

No third-party implementation is vendored. `models.ts` invokes Three APIs; Three and its types remain external dependencies with their own licenses. The builder must verify and retain licenses of the versions actually installed. No dependency LICENSE text was copied from an unverified source.

The optional detailed GLB is excluded: its Blender body, CMU jog and added hand poses have mixed provenance and different conditions. None of its model, motion, LOD index, loader or notice files are present. No real scene/user data, secrets, access grants, authentication material or runtime configuration is present.

New handoff-local contact-pose.ts is a minimal structural presentation contract authored for this kit, with no core imports. Its license is intentionally pending the same RPM release decision. The original models.ts bytes are unmodified; its local import resolves to this substitute structural type.
