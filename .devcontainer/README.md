# Devcontainer

How credentials reach this container, what survives a rebuild, and what deploy tooling can do
from inside it. For getting the app running, see [GETTING_STARTED.md](../GETTING_STARTED.md).

## Host requirements

- **Docker** with Compose **2.24 or later** — the optional `env_file` entries need it.
- **VS Code** with the **Dev Containers** extension.
- **A GitHub token scoped to this repository** — optional, for `gh` inside the container: a
  fine-grained personal access token with only this repository selected and an expiry. The
  container never inherits the host's own `gh` login.
- **An SSH agent with your key loaded** — for `git push` over SSH, and for deploy tooling.
  `ssh-add -l` on the host should list it.

## What the container inherits

| Credential                                                     | How it arrives                                                                             | Survives a rebuild?                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `git push` / `git pull` over SSH                               | VS Code forwards the host's SSH agent (`SSH_AUTH_SOCK`)                                    | Yes                                                  |
| SSH to your server (Kamal)                                     | The same forwarded agent                                                                   | Yes                                                  |
| `gh` CLI                                                       | Not inherited. You log it in from the host with the scoped token (First open, step 4)      | **No** — log in again after a rebuild                |
| `GITHUB_REPOSITORY`, `GITHUB_REPOSITORY_OWNER`, `GITHUB_ACTOR` | `initialize.sh` derives them from the `origin` remote                                      | Yes                                                  |
| Git author name and email                                      | VS Code copies the host's `~/.gitconfig`                                                   | Yes                                                  |
| `HOST_IP`, `APP_HOST`, `API_HOST`                              | `local.env`, which you write                                                               | Yes                                                  |
| AI coding agents (Claude Code, Codex…)                         | Not part of this devcontainer: install and log in the one you use, from the host or inside | Only if its home is kept outside the container layer |
| Production secrets                                             | Not inherited, by design — they live in the `production` GitHub Environment                | **No**                                               |

`initializeCommand` runs `initialize.sh` **on the host** before every start. It writes
`.devcontainer/.host.env` (mode 600, gitignored) with no credential in it, and always exits 0,
so a host without `git` still opens the container. Compose loads `.host.env` and then `local.env`
as environment files; both are optional, and a variable set in `local.env` wins.

Environment files are read when the container is **created**. Reopening an existing container
keeps the old values; **Dev Containers: Rebuild Container** picks up new ones.

## First open

1. On the host, optionally: `ssh-add` your key.
2. Only if you will use deploy tooling, before opening:
   ```bash
   cp .devcontainer/local.env.example .devcontainer/local.env
   $EDITOR .devcontainer/local.env    # HOST_IP, APP_HOST and API_HOST
   ```
   Doing this after the container exists works too, followed by a rebuild.
3. Open the folder in VS Code and run **Dev Containers: Reopen in Container**. `post-create.sh`
   installs dependencies, creates the `drawhaus_e2e` database, installs Chromium and Kamal.
4. For `gh`, on the host, from this folder, with the scoped token in `$TOKEN`:
   ```bash
   printf '%s\n' "$TOKEN" | docker exec -i -u vscode \
     "$(docker ps -q --filter label=devcontainer.local_folder="$PWD")" \
     gh auth login -h github.com --with-token
   ```
   The token goes through stdin, never an argument or an environment variable. A rebuild drops the
   login; run it again.
5. Check, in a container terminal:
   ```bash
   gh auth status          # logged in, after step 4
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
`build`, `app boot`, and `app exec` or `accessory exec` without `--reuse`. They push an image, need
the registry, or write the container's env file from `.kamal/secrets`, which in this container
resolves every secret to an empty string, silently. Run them through GitHub Actions (`deploy.yml`),
or from the host with the secrets exported, per
[docs/guides/kamal-deploy.md](../docs/guides/kamal-deploy.md). The runbook's backup and dump commands pass `--reuse`, so they need no registry login.

## Security model

- **The devcontainer's own files carry no credential.** `.host.env` holds only the three
  `GITHUB_*` values; nothing in `devcontainer.json`, Compose or `local.env` holds a token.
- **The token you log `gh` in with is the whole exposure.** `gh` stores it in plain text in
  `~/.config/gh/hosts.yml`, since the container has no keyring, and every process in the
  container can read it — extensions, AI agents, package install scripts. Scoped to this one
  repository and with an expiry, a leak reaches this repository for a limited time and nothing
  else: not your other repositories, not private ones, not your account.
- **Never pass it as `GH_TOKEN`** in `local.env` or the Compose environment: an environment
  variable beats the stored login, shows up in `docker inspect`, and survives in the container's
  configuration.
- **GitHub Projects owned by a user account are out of reach for fine-grained tokens.** If you
  work a board from here, use a separate classic token with only `project`, `read:org` and
  `read:discussion` for it, never a wider one.
- **On Windows**, `initializeCommand` runs under `cmd.exe`. With Git for Windows' `sh` on the
  `PATH` it behaves as above; without it the command falls through, no `.host.env` is written,
  and the `GITHUB_*` values have to go in `local.env`. Untested on Windows. Under WSL it is Linux.
- **In Codespaces**, Codespaces provides its own `GITHUB_TOKEN`; step 4 is not needed.

## Troubleshooting

| Symptom                                                                                             | Cause                                                                                                                                                    | Fix                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Kamal raises `GITHUB_REPOSITORY_OWNER must be set` (or `GITHUB_ACTOR`)                              | `initialize.sh` found no `origin` remote, did not run, or the container predates it                                                                      | On the host, `cat .devcontainer/.host.env`; then **Rebuild Container** |
| Kamal raises `HOST_IP must be set`, or `APP_HOST must be set to a bare public hostname … got nil`   | No `local.env`, an empty value in it, or the container predates it                                                                                       | Fill it in from `local.env.example`, then **Rebuild Container**        |
| `gh` asks you to log in                                                                             | The container was rebuilt, or step 4 of First open never ran                                                                                             | Step 4, on the host                                                    |
| `gh` answers `Bad credentials`, or 403/404 on another repository                                    | The token expired — or it is scoped to this repository, by design                                                                                        | A new token; another repository gets its own                           |
| An edit to `local.env` has no effect                                                                | Environment files are read at creation; reopening does not recreate                                                                                      | **Rebuild Container**                                                  |
| `ssh-add -l` says it cannot connect to the agent, or SSH fails with `Permission denied (publickey)` | The agent is forwarded only to processes VS Code starts; `docker exec` and outside terminals have no `SSH_AUTH_SOCK`, and the host agent may hold no key | Use a VS Code terminal; on the host, `ssh-add` your key                |
