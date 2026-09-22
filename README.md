# Job Tracker

A private, mobile-friendly application dashboard that reads the Applications tab of Google Sheets. Muse continues adding jobs and changing application statuses in the sheet. This app never writes to it.

## Included

- Search across every field; filter by status and visa compatibility; sort by discovery date, company, or follow-up date.
- List and board views, full research notes, resume/cover-letter references, safe job links, and follow-ups due today or earlier.
- Server-side Google Sheets refresh every 60 seconds. Browser refreshes every minute while visible and when returning to the tab. Manual refresh is limited to once per 5 seconds.
- Last successful results remain in memory during sync failures. They do not survive a server restart. No personal application data is committed to this repository.
- Explicit setup, demo, empty, and delayed-sync states. Read-only by design: make changes through Muse or Google Sheets.

## Local preview

Install Node.js 24 and pnpm 11.25.0, then:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm start
```

Open http://127.0.0.1:3000. On Windows, use `Copy-Item .env.example .env` instead of `cp`. Set `DEMO_MODE=true` in `.env` to explore fictional sample applications without Google credentials. Demo is always visibly labeled; turn it off for live data.

## Connect the private Google Sheet

1. Create/select a Google Cloud project and enable the Google Sheets API.
2. Create a service account. No project-wide IAM roles or domain-wide delegation are needed.
3. Create a JSON key for it. Save it locally as `secrets/google-service-account.json`. Never paste it into chat or commit it.
4. Share only the job-tracker spreadsheet with the service account's `client_email`, using **Viewer** permission. Keep the sheet private otherwise.
5. Copy `.env.example` to `.env`. The current sheet ID and `Applications!A:ZZ` range are already provided. Set `DEMO_MODE=false`.
6. Start/restart the app. A successful sync shows a timestamp and your jobs.

Required headers: `Company`, `Job title`, `Status`. Optional headers: `Location`, `Job link`, `Date found`, `Date applied`, `Visa compatibility`, `CPT/OPT/Sponsorship notes`, `Resume version`, `Cover letter`, `Follow-up date`, `Notes`, `Job ID`. Column order can change. Use YYYY-MM-DD dates for reliable sorting and follow-up handling. Set the server/browser time zones appropriately for your location.

Optional permanent `Job ID` values improve identity tracking if Muse edits a title or job link. Without them, identity uses company/title/link; sorting and status updates work normally. Duplicate identities get per-response suffixes. IDs do not affect importing all rows. The app does not add or modify sheet columns. Document filenames are references, not uploaded attachments.

## Debian VM deployment

Keep the GitHub repository private. Authenticate Git on the VM with your own GitHub login or a repository-scoped SSH deploy key with read access, then clone the repository. Install Docker Engine with its Compose plugin from Docker's official Debian instructions.

```sh
git clone git@github.com:rajwinder-mankoo/job-tracker.git
cd job-tracker
cp .env.example .env
mkdir -p secrets
# Place your service account JSON in secrets/google-service-account.json.
# Container runs as uid 1000: ensure it can read the key without granting broad access.
sudo chown 1000:1000 secrets/google-service-account.json
sudo chmod 600 secrets/google-service-account.json
docker compose up -d --build
curl http://127.0.0.1:3000/health
```

Install and authenticate Tailscale on the VM, then expose the local app privately:

```sh
sudo tailscale serve --bg http://127.0.0.1:3000
```

Use the HTTPS address printed by Tailscale on devices in your tailnet. The Compose port binds only to loopback. There is no application login; Tailscale access controls are the access boundary. Do not publish the port or enable Funnel. Confirm your tailnet policy allows only the people/devices intended to read your applications.

Update after code is pushed:

```sh
git pull --ff-only
docker compose up -d --build
```

## Verification

```sh
pnpm test
```

Tests cover reordered headers, blank rows, unsafe URLs, stable identity, duplicate rows, concurrent requests, empty results, and preservation of data on failure. `/health` checks the app process, not Google authorization. Real Google access needs the service account setup above. Back up the sheet, `.env`, and credential file securely; the app has no separate job database.

## References

- https://developers.google.com/identity/protocols/oauth2/service-account
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- https://docs.docker.com/engine/install/debian/
- https://tailscale.com/docs/features/tailscale-serve
