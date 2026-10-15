# Looking around in player view

[English](PLAYER_VIEW.md) | [日本語](PLAYER_VIEW.ja.md)

Switch between first person (一人称へ) and third person (三人称へ) at the top left inside the 3D viewport. The control is always visible and supports pointer, touch and keyboard interaction. Third person shows spectator world layout, not player observations. Playback, one step, look and recenter controls sit along the viewport's bottom edge.

In first person, “マウスで見回す” locks the pointer for horizontal looking. Drag the viewport if pointer lock is unavailable. Vertical perception is not implemented.

| Control | Effect on observation |
|---|---|
| Horizontal mouse movement / dragging | Turn the head; beyond ±137°, the body follows so the same gesture can look behind |
| Shift + mouse / drag | Turn the body while preserving relative head angle |
| Esc | Release pointer control, retaining displayed orientation |
| “視線を正面へ” / R with viewport focused | Set relative head angle to 0°; retain body heading, position and time |
| Left/right arrows with viewport focused | Turn the head by 5°; add Shift to turn the body |
| Sensitivity | Default is twice the former sensitivity; former/faster choices change mouse-to-angle gain, not model perception or body ability |

Sensitivity and angle sliders are under “見回しの設定・操作方法.” Open “研究ツール” below for scene selection, reset/restore, manual coaching, JSON editing and independent reviews. Normal coaching belongs in the Codex conversation. Typing in inputs does not turn the camera. Spectator and recorded-comparison views cannot rotate the research player's body/head. Leaving the window releases control. There is no WASD movement: movement is a model action.

## Why separate head and body?

A head turn is an observation intervention that changes acquired visual information. Body direction is a condition for examining self orientation and body-relative action. Gaze combines body heading and relative head angle; the same sensor restricts rendered entities and cognitive inputs. Scenes v2 and later also observe other players' visible body orientation.

Looking pauses time and records `head-turn` / `body-turn`, acquisition order, self pose, bundle, profile, execution mode and model settings in the observation history. Mouse input is normally batched every 50 ms and flushed when control ends or switches between head/body. Displayed orientation and recorded observation match; release, blur and restore discard only undisplayed input.

A segment holds at most 256 events. Normally it autosaves at 224 and continues from the same position, time and memory without deleting earlier observations. Remaining capacity permits interaction during saving; only a slow save pauses acquisition. “保存を再試行” retries the same request without resetting the scene.

Continuations overlap one boundary observation and replay from its original memory-before, preserving timestamps/confidence. Private snapshots store the predecessor ID/hash and interval-start world. That world is replay-only, never player input or observation context. History replay covers the current segment; restore earlier segments through “保存した時点.” Links also appear in `research-log`. Coaching start ticks belong to the current segment; use the appropriate saved segment for earlier intervals.

Recenter resets only the head. Restarting the scene resets movement/time but saves the prior state and selects it as a restore point. “保存した時点へ戻る” restores that position, time and history; another saved point can be selected explicitly.

The 50 ms batching, body-follow behavior and segment boundaries are interface/storage assumptions, not human perceptual or body-turn timing.

## What can this evaluate?

Manual turns are researcher interventions, distinct from autonomous model looking. Paused turns acquire information at the same simulation time while the world is stationary. They do not validate autonomous exploration, physical turning time, reaction speed or pre-contact decisions.

The tool supports hypotheses and counterexample comparisons about observation, memory, judgment and reobservation. Saving coaching does not train the executable model automatically. The judgment document remains independent, with separate owner adoption.

1. Confirm layout, attack/defense, orientation and scripted versus autonomous actors.
2. Inspect observations through manual looking, preserve the reference and coach in conversation.
3. Form a mechanism candidate: which cues, predictions and action-change conditions matter?
4. Separate manual-intervention effects from autonomous actions; compare counterexamples, ablations and evaluation conditions frozen in advance.
5. Evaluate executable results and independent document responses separately, then obtain owner decisions.

Scene v3 supports simplified running/passing/catching/contact and autonomous actors; scripted opponents do not react to the player. Scripted scenes alone cannot establish appropriate release just before a tackle. Software tests verify input/storage/replay integrity, not human cognitive validity or unseen transfer. See [Closed loop](../../../models/player/spec/CLOSED_LOOP.md) and [evaluation protocol](../../../evaluation/PROTOCOL.md).

## Field of view and distance

Dynamic scenes accept `horizontalFovDegrees` from 60–120. Unspecified existing scenes retain 90° and historical observations. Perspective camera, visibility and bundle use the same value, saved in scene hashes/snapshots. Aspect-ratio changes adjust vertical FOV to preserve horizontal FOV; viewpoint and eye height stay fixed.

Human binocular field including peripheral vision is approximately 180–200°, with unequal precision across the field ([National Research Council](https://www.ncbi.nlm.nih.gov/books/NBK207559/)). Projecting all of it onto a small flat display is not naturally equivalent: disagreement between physical viewing angle and rendered FOV affects wide-angle appearance ([Microsoft Research](https://www.microsoft.com/en-us/research/publication/real-time-warps-for-improved-wide-angle-viewing/)).

Use ordinary perspective and looking around; 110° is a provisional engineering condition for usability assessment. Overhead teammate/opponent labels are hidden, with team colors shown above the viewport and body-direction arrows at the feet. Flat panoramic projection changes perceived distance/direction and is not used here.

For geometric distance calibration, measure viewport width W and eye-to-screen distance D; use horizontal FOV `2 atan(W / (2D))` as a reference. This has a different purpose from wide-angle game settings and yields a narrower field in a small panel. Combining broad coverage with natural appearance also requires assessing display size, viewing position and hardware.

The sensor has no central/peripheral precision difference or eye-movement model. FOV changes or screen blur do not reproduce human vision. Save changed FOV as a new scene revision, keep histories separate and hold FOV constant when comparing defender routes.
