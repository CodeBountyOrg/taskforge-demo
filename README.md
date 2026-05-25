# TaskForge

A simple, community-maintained open-source task tracker. Add tasks, check them off, never lose them — everything is stored in your browser.

> **Status:** Active development. We accept bounties via [CodeBounty](https://codebounty.dev) on tagged issues.

## Features

- Single-page, zero-build static web app
- Tasks persist in `localStorage` — no account, no server, no tracking
- Keyboard-friendly (more shortcuts coming, see #5)
- Light & dark themes with persisted user preference
- MIT licensed

## Quick start

```sh
git clone https://github.com/CodeBountyOrg/taskforge-demo.git
cd taskforge-demo
python3 -m http.server 8000      # or any static file server
open http://localhost:8000
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) — TL;DR:

1. Pick an open issue with the `💰 Bounty Available` label.
2. Apply on the bounty's CodeBounty page (linked in the issue).
3. Once accepted, fork → branch → PR. Reference the issue number in the PR body (`Closes #N`).
4. After merge, your payout is released via Stripe.

Maintainers approve bounties before they open and review all PRs before merge.

## Tech

- HTML5, CSS3 (custom properties + flexbox)
- Vanilla JavaScript (ES2020+); no framework, no build step
- `localStorage` for persistence
- ESLint + Prettier for code style

## License

MIT — see [LICENSE](./LICENSE).
