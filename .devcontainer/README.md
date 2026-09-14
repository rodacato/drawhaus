# Devcontainer

How credentials reach this container, what survives a rebuild, and what deploy tooling can do
from inside it. For getting the app running, see [GETTING_STARTED.md](../GETTING_STARTED.md).

## Host requirements

- **Docker** with Compose **2.24 or later** — the optional `env_file` entries need it.
- **VS Code** with the **Dev Containers** extension.
- **`gh` logged in on the host** — optional, recommended. Without it `gh` inside the container
  starts logged out after every rebuild.
- **An SSH agent with your key loaded** — for `git push` over SSH, and for deploy tooling.
  `ssh-add -l` on the host should list it.

## What the container inherits

| Credential                                                     | How it arrives                                                                 | Survives a rebuild? |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------- |
| `git push` / `git pull` over SSH                               | VS Code forwards the host's SSH agent (`SSH_AUTH_SOCK`)                        | Yes                 |
| SSH to your server (Kamal)                                     | The same forwarded agent                                                       | Yes                 |
| `gh` CLI                                                       | `initialize.sh` runs `gh auth token` on the host into `.host.env` → `GH_TOKEN` | Yes                 |
| `GITHUB_REPOSITORY`, `GITHUB_REPOSITORY_OWNER`, `GITHUB_ACTOR` | `initialize.sh` derives them from the `origin` remote                          | Yes                 |
| Git author name and email                                      | VS Code copies the host's `~/.gitconfig`                                       | Yes                 |
| `HOST_IP`, `APP_HOST`, `API_HOST`                              | `local.env`, which you write                                                   | Yes                 |
| Claude Code or any other tool's login                          | Not inherited — it lives in the container layer                                | **No**              |
| Production secrets                                             | Not inherited, by design — they live in the `production` GitHub Environment    | **No**              |

`initializeCommand` runs `initialize.sh` **on the host** before every start. It writes
`.devcontainer/.host.env` (mode 600, gitignored) and always exits 0, so a host without `gh` or
`git` still opens the container. Compose loads `.host.env` and then `local.env` as environment
files; both are optional, and a variable set in `local.env` wins.

Environment files are read when the container is **created**. Reopening an existing container
keeps the old values; **Dev Containers: Rebuild Container** picks up new ones.

## First open

1. On the host, optionally: `gh auth login`, and `ssh-add` your key.
2. Only if you will use deploy tooling, before opening:
   ```bash
   cp .devcontainer/local.env.example .devcontainer/local.env
   $EDITOR .devcontainer/local.env    # HOST_IP, APP_HOST and API_HOST
   ```
   Doing this after the container exists works too, followed by a rebuild.
3. Open the folder in VS Code and run **Dev Containers: Reopen in Container**. `post-create.sh`
   installs dependencies, creates the `drawhaus_e2e` database, installs Chromium and Kamal.
4. Check, in a container terminal:
   ```bash
   gh auth status          # "Logged in … (GH_TOKEN)" when the host was logged in
   env | grep ^GITHUB_     # the three derived values
   ```

## Deploy tooling from the container

`config/deploy.backend.yml` and `config/deploy.frontend.yml` render from `GITHUB_REPOSITORY_OWNER`,
`GITHUB_ACTOR`, `HOST_IP`, `APP_HOST` and `API_HOST`, and every one of them is in the environment.
Commands that only read, or that run inside a container already up on the server, need no secret.
Every command takes the config it targets:

```bash
kamal config -c config/deploy.backend.yml         # resolved config — check it before anything else
kamal config -c config/deploy.frontend.yml
kamal app details -c config/deploy.backend.yml    # running containers, image, uptime
kamal app logs -n 200 -c config/deploy.backend.yml
kamal accessory details postgres -c config/deploy.backend.yml
kamal audit -c config/deploy.backend.yml
kamal console -c config/deploy.backend.yml        # also: shell, db, redis, logs (frontend: shell, logs)
```

**Why the aliases use `--reuse`.** Without it Kamal starts a fresh container, and that begins with
a registry login on the server — `KAMAL_REGISTRY_PASSWORD`, which exists only in CI. With
`--reuse --interactive`, `app exec` runs `docker exec` over SSH into the running container and
never logs in. `accessory exec` (the `db` and `redis` aliases) takes the same flags; that it opens
without a registry login is still **to verify** from this container.

**What does not work here**, and must not be forced: `deploy`, `redeploy`, `rollback`, `setup`,
`build`, `app boot`, and `app exec` without `--reuse` — which includes the migration and backup
commands in the deploy runbook. They push an image, need the registry, or write the container's
env file from `.kamal/secrets`, which in this container resolves every secret to an empty string,
silently. Run them through GitHub Actions (`deploy.yml`), or from the host with the secrets
exported, per [docs/guides/kamal-deploy.md](../docs/guides/kamal-deploy.md).

## Security model

- **The token carries every scope of the host's `gh` login** — usually `repo`, `read:org` and
  `gist` — not a scope chosen for this container.
- **It sits in the container's environment**, readable by every process in it (extensions,
  AI agents, `docker inspect` on the host), and **in plain text in `.host.env`** on disk. The file
  is gitignored and excluded from the image build context by `.dockerignore`.
- **This is no worse than `gh auth login` inside the container**, which writes a token in plain
  text to `~/.config/gh/hosts.yml`, since there is no keyring to hold it. The difference: it is
  the host's own token, so revoking it logs the host out too.
- **To narrow it**, put a fine-grained personal access token scoped to this repository in
  `local.env` as `GH_TOKEN`. It overrides the inherited one in the environment; `.host.env` is
  still written.
- **Without `gh` on the host**, `GH_TOKEN` is simply absent. `gh auth login` inside the container
  works until the next rebuild.
- **On Windows**, `initializeCommand` runs under `cmd.exe`. With Git for Windows' `sh` on the
  `PATH` it behaves as above; without it the command falls through, no `.host.env` is written,
  and the `GITHUB_*` values have to go in `local.env`. Untested on Windows. Under WSL it is Linux,
  and needs `gh` installed inside WSL.
- **In Codespaces** the script runs in the cloud host and finds no `gh` login there; Codespaces
  provides its own `GITHUB_TOKEN`.

## Troubleshooting

| Symptom                                                                                             | Cause                                                                                                                                                    | Fix                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Kamal raises `GITHUB_REPOSITORY_OWNER must be set` (or `GITHUB_ACTOR`)                              | `initialize.sh` found no `origin` remote, did not run, or the container predates it                                                                      | On the host, `cat .devcontainer/.host.env`; then **Rebuild Container** |
| Kamal raises `HOST_IP must be set`, or `APP_HOST must be set to a bare public hostname … got nil`   | No `local.env`, an empty value in it, or the container predates it                                                                                       | Fill it in from `local.env.example`, then **Rebuild Container**        |
| `gh` asks you to log in                                                                             | The host's `gh` is not logged in, is not on the `PATH` VS Code starts with, or was logged in after the container was created                             | `gh auth status` on the host, then **Rebuild Container**               |
| An edit to `local.env` has no effect                                                                | Environment files are read at creation; reopening does not recreate                                                                                      | **Rebuild Container**                                                  |
| `ssh-add -l` says it cannot connect to the agent, or SSH fails with `Permission denied (publickey)` | The agent is forwarded only to processes VS Code starts; `docker exec` and outside terminals have no `SSH_AUTH_SOCK`, and the host agent may hold no key | Use a VS Code terminal; on the host, `ssh-add` your key                |
