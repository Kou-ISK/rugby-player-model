# H-WM-1: receiver deliberation research mode

[English](H-WM-1.md) | [日本語](H-WM-1.ja.md)

Unvalidated hypothesis, selectable alongside the unchanged baseline default. It constrains receiver comparison/selection and pass eligibility/explanation; it does not constrain every judgment or claim a complete model of human working memory. Kinematic scenes leave passing as an intention; motor scenes provide bounded execution.

Execution contract v2 requires `executionContractVersion: 2`, `executionMode`, and the observation-only bundle/memory/profile/rules. Baseline uses `{mode:"baseline",policyVersion:"baseline-v1"}`. Research mode uses `{mode:"h-wm-1",policyVersion:"receiver-deliberation-v1",capacity:{kind:"finite",k:4}}` or `{kind:"unlimited"}`. K is an integer 1–128, an engineering bound rather than a measured human capacity. Unknown versions and extra fields are rejected.

Encoding still takes four current percepts by baseline salience. Retention still keeps up to 128 original episodes within 30 simulation seconds. Retrieval selects latest evidence per entity/modality and decays confidence without changing original observation time, source confidence or yaw. Research ranking is call > ball > player, then current confidence, observation recency and Unicode-scalar source ID. It selects the first K retrieved beliefs (or all); the first eligible backward fresh visual teammate in that ranking is a receiver.

Risk and orienting from retained observations uses the full retrieved pool, as do existing fresh/no-fresh predicates. Those predicates do not become capacity predicates. Trace 4 includes encoded, retrieved, ranked and selected evidence and inclusion reasons. The workingMemory field remains a display excerpt and is never reinterpreted as a bottleneck.

Compare baseline / research unlimited / research finite separately. Unlimited versus finite isolates capacity when all other inputs agree. Baseline versus research unlimited includes the new ranking policy. W0 pins 36 baseline results; W1–W10 exercise mechanism effects, evidence preservation, excluded threat behavior and observation-only boundaries. W4b's cross-pool comparison also changes orienting and is explicitly a mixed intervention. Passing tests does not establish rugby benefit, biological validity or owner adoption.

For compatibility, Trace 4 also retains the old `workingMemory` display excerpt. The capacity-constrained receiver set is `deliberation.selected`; the baseline-named display field never defines K.
