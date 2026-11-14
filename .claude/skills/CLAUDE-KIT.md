# claude-kit (vendored)

Copied from https://github.com/JohnnyVizz/claude-kit at commit c871c153ead54ad9547cc717d0f3e5a676c73986 (MIT).
Reviewed before vendoring; update by re-copying from a reviewed commit.

| Path | What |
| --- | --- |
| `skills/savvy-flow/` + `agents/savvy-*.md` | `/savvy-flow <task>` skill and its five tiered worker agents |
| `skills/savvy-progress/` | Mod: progress bar above the prompt and agents panel (`/agents-info`) |
| `skills/session-band/` | Mod: band with turn, speed, cost, cache countdown and context; the macOS notifier in `notifier/` is optional (`notifier/build.sh`) |

Mods load from a project `.claude/skills/<name>/` plugin folder. Test files were left out.
`savvy-fable` uses the Fable model; `/savvy-flow` only runs when invoked by hand.
