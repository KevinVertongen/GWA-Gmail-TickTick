# Gmail TickTick add-on

> A Google Workspace Add-on that creates [TickTick](https://ticktick.com/) tasks directly from Gmail, with fields pre-populated from the open email.

## Tech Stack

- Google Apps Script (GAS) — runtime
- Google OAuth2 Library for Apps Script (`1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMB4R3P`)
- TickTick Open API (OAuth 2.0)
- clasp (Command Line Apps Script) — local development & deployment
- Husky — git hook management

## Prerequisites

- Node.js (for clasp and Husky)
- A Google account with the [Apps Script API enabled](https://script.google.com/home/usersettings)
- A [TickTick developer app](https://developer.ticktick.com) with OAuth 2.0 credentials

## Development Environment

### clasp

Install globally:

```bash
npm install -g @google/clasp
clasp login
```

### Clone the Apps Script project

```bash
git clone git@github.com/KevinVertongen/GWA-Gmail-TickTick
cd GWA-Gmail-TickTick
npm install
clasp clone <YOUR_SCRIPT_ID>
```

> The Script ID can be found in script.google.com under **Project Settings → Script ID**.

### Husky (pre-push hook)

Husky is configured to run `clasp push` automatically before every `git push`, keeping GitHub and Apps Script in sync.
It is installed as a dev dependency and requires no manual setup after `npm install`.

```bash
npm install   # installs husky and wires up the hook
```

## Configuration

Credentials are stored in your Google **User Properties** (not in code).
Set them once by updating the `Setup.js` script and running this function once from the Apps Script editor:

```javascript
setUserProperties()
```

## Set up the OAuth flow

To authenticate against the OAuth2 provider of TickTick register your add-on at [developer.ticktick.com](https://developer.ticktick.com/manage) and obtain a client ID and secret.
To get your Apps Script "Redirect URI" run the `printRedirectUri()` function provided in the `Setup.js` script.

The URL will always be in the following format: `https://script.google.com/macros/d/{SCRIPT ID}/usercallback`.
Where `{SCRIPT ID}` is the ID of your Apps Script, found in your "Project properties".

## OAuth Scopes

Configured in `appsscript.json`:

| Scope | Purpose |
|---|---|
| `gmail.addons.execute` | Required base scope for the add-on runtime |
| `gmail.addons.current.message.readonly` | Read email metadata (subject, sender, date) |
| `gmail.readonly` | Read email body via `getPlainBody()` |
| `script.external_request` | Allow `UrlFetchApp` to call the TickTick API |
| `userinfo.email` | Identify the current user |

## First-time OAuth setup

Run this function once from the Apps Script editor to authorize the add-on with TickTick:

```javascript
startTickTickOAuth()
```

Open the logged URL in your browser, complete the TickTick consent screen, and you're done.
Tokens are stored and refreshed automatically by the OAuth2 library.

## Development Workflow

```bash
# Pull latest from Apps Script editor to local

clasp pull

# Edit locally, then commit and push
# clasp push fires automatically via the Husky pre-push hook
git add .
git commit -m "feat: your change"
git push   # triggers clasp push → syncs to Apps Script
```

> **Note:** clasp converts `.gs` ↔ `.js` between Apps Script and local. GitHub stores `.js` files; script.google.com shows `.gs` files. This is expected behaviour.

## Project Structure

```
gmail-ticktick-addon/
├── .husky/
│   └── pre-push          ← runs clasp push before every git push
├── Code.js               ← main add-on source (pushed as Code.gs)
├── Setup.js              ← setup functions, only run on first use
├── Tests.js              ← test functions
├── appsscript.json       ← manifest: scopes, triggers, OAuth config
├── .claspignore          ← controls which files clasp pushes
├── .clasp.json           ← links local project to Apps Script (not committed if public repo)
└── package.json          ← husky dev dependency
```

## Add-on Features

- **Contextual trigger** — activates automatically when opening an email in Gmail
- **Editable task title** — pre-filled from the email subject
- **Editable notes** — pre-filled with sender, Gmail message link, and trimmed email body
- **Project selector** — dropdown populated from your TickTick projects via the API
- **Due date picker** — pre-filled from the email date
- **Priority selector** — None / Low / Medium / High (TickTick values: `0, 1, 3, 5`)

## Deployment

Use **Test deployments** in script.google.com during development — this always runs the latest saved version without requiring a formal versioned release.

After any change to `appsscript.json` (e.g. adding OAuth scopes), uninstall and reinstall the test deployment to trigger a fresh authorization prompt.
