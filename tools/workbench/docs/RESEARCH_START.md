# Start research with a conversational collaborator

[English](RESEARCH_START.md) | [日本語](RESEARCH_START.ja.md)

Use this guide after downloading or cloning the public repository. It needs no previous private conversation, researcher's personal files or configured Mac launcher. Codex is one possible collaborator; the tool embeds no AI API. The workbench UI currently uses Japanese labels; [the operation tutorial](FIRST_RUN.md) includes translations. Its edit/adopt/undo exercises are optional software checks, not required research steps.

## 1. Choose storage and check the runtime

Use Node.js **24** and npm. Open the repository directory in your conversational coding tool or terminal. Verify `node --version` before installing; another major version is unsupported. Git is optional for a downloaded source archive; unavailable Git metadata is recorded as unavailable.

On macOS/Linux or a POSIX shell, run from the repository root:

```sh
node --version
npm ci
export RPM_SESSION_DIR="$HOME/rpm-research-data/session-01"
mkdir -p "$RPM_SESSION_DIR/work"
npm run --silent bridge -- status
```

On Windows PowerShell, the equivalent setup is:

```powershell
node --version
npm ci
$env:RPM_SESSION_DIR = Join-Path $HOME 'rpm-research-data/session-01'
New-Item -ItemType Directory -Force -Path (Join-Path $env:RPM_SESSION_DIR 'work')
npm run --silent bridge -- status
```

Choose a new directory for a new study and retain that exact absolute path for resumption. Inspect an existing directory before using it; never delete/reinitialize it to start over. The CLI creates the directory and reports initial versions when empty. The first explicit scene/snapshot/candidate write persists `state.json`; `status` alone does not save a study. Do not use `session init --synthetic` for actual coaching: that command declares a **synthetic tutorial**, even when the real research also uses generated scenes.

Keep notes, captures and generated files in this private `work/` directory, outside the checkout. Set the same `RPM_SESSION_DIR` in **every** server/CLI terminal and agent command environment; shell settings do not automatically carry to another terminal. Do not use `start-rpm.command` or `bridge-rpm.command` unless this installation's personal Mac configuration is explicitly intended.

## 2. Create the research entry point before asking for cases

Copy [RESEARCH_CHECKPOINT.md](RESEARCH_CHECKPOINT.md) to `$RPM_SESSION_DIR/work/research-checkpoint.md`, or use [the Japanese template](RESEARCH_CHECKPOINT.ja.md). Do not replace an existing checkpoint; read and update it. The template is a private note format, not a file accepted by a bridge command.

Ask the collaborator:

> Read AGENTS.md, tools/workbench/docs/RESEARCH_LOOP.md and docs/COGNITIVE_RESEARCH.md. Use the private session at [my absolute session path] and its work/research-checkpoint.md. Start by mapping the goals, relationships, breakdowns and repair relevant to attack, support and defense. Reuse indexed evidence if present; otherwise mark gaps and ask one broad question. Select later cases to distinguish explanations. Preserve each response, keep models unchanged during discovery, and leave the next action and reason in the checkpoint. Use generated scenes, with no real-match footage or embedded AI API.

Confirm the scope, current stage, current evidence and next human action before launching a chain of detailed comparisons. A first session can begin with a broad conversation; it does not require approving a rule or completing a scene quota. The person responsible for this session supplies coaching and adoption decisions.

## 3. Present and capture when the question needs a scene

When the checkpoint identifies a useful comparison, start the local workbench from a terminal with the same session setting:

```sh
npm run dev
```

Open the printed loopback URL and leave that terminal running. For a busy port, set `PORT` to an unused port before starting; do not terminate unrelated work. In a second terminal, set the same session path and use:

```sh
npm run --silent bridge -- views
```

Follow [presentation transport](PRESENTATION.md) using `npm run --silent bridge --` in place of the configured Mac's launcher. The collaborator prepares a scene and sends `present`; the person looks/plays in the browser and gives coaching in the conversation. Capture the intended tab's acquired history and wait for the completed receipt before saving scene-linked feedback. Browser typing is optional manual recording, not a message to the AI.

Generating a snapshot is not showing it; a completed receipt is not human acceptance. A scripted scene is a controlled stimulus, not proof of autonomous cooperation. For verbal-only guidance, save the exact text and its stated scenario in private notes with no observation reference; do not borrow another scene's snapshot. Do not needlessly automate browser controls.

## 4. Resume and move between stages

Read `work/research-checkpoint.md` first. Check its referenced records and current versions with `status`/`research-log`; use `views` if the next task depends on a live display. Do not replay the entire conversation or assume the newest snapshot is the intended one.

After coaching, save the original, update only new information and choose the next action under [the research loop](RESEARCH_LOOP.md): framework review, discriminating comparison, synthesis, or tool repair. Mechanism design and evaluation happen later, after their evidence gates. Avoid repetitive follow-ups and park details unrelated to the parent question.

Stop the server with Control-C in its terminal, or `npm run bridge -- stop` with the same session setting. Resume with the same path and `npm run dev`; never rerun tutorial initialization over it.

## What this setup establishes

The public files provide installation, observation/recording, staged research instructions, a resumable checkpoint and later proposal exchange. They do not guarantee that a collaborator follows instructions, validate human cognition, or make every rugby action executable. Check [capability limits](../../../docs/LIMITATIONS.md) before designing a comparison. Paused looking is not a measurement of gaze or reaction time.

Keep real coaching private. To contribute, author a permitted synthetic reproduction and follow [CONTRIBUTING](../../../CONTRIBUTING.md). The standalone [judgment evaluation](JUDGMENT_EVALUATION.md) remains independent of player-model adoption. `npm run test:first-run` tests an isolated software tutorial; it does not certify research-method adherence, every operating system or human acceptance.
