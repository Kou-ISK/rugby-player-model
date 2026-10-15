# Synthetic simulation

[English](README.md) | [日本語](README.ja.md)

World generation, sensing, body execution and read-only playback are research tools. Only sensing constructs permitted observations for the player model. Legacy scenes use static or scripted other actors; their passing/contact intentions are unsupported. Optional scene v3 adds bounded motor, ball/contact abstractions and independent actors. These are engineering hypotheses, not validated rugby physics.

See [scene operations](../workbench/docs/DYNAMIC_SCENES.md), [orientation/phase](../../models/player/spec/ORIENTATION_PHASE.md) and [closed-loop contracts](../../models/player/spec/CLOSED_LOOP.md). World truth and runtime frames remain evaluator-only; neither cognition nor player-role document evaluation receives them.
