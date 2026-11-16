# Releasing and publishing

## Cut a release

Releases are automated: pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which
checks the code, builds every browser package and publishes a GitHub Release.

1. Make sure `main` is green: `pnpm check`.
2. In `CHANGELOG.md`, add a `## [X.Y.Z] - YYYY-MM-DD` section. Its text becomes the release
   notes; the workflow fails if the section is missing.
3. Bump the version, commit and tag in one step, then push:

   ```bash
   git add CHANGELOG.md
   npm version 1.1.0 --force -m "chore: release v%s"   # or: patch | minor | major
   git push origin main --follow-tags
   ```

   `npm version` writes the version to `package.json` (WXT copies it into the manifest),
   commits it together with the staged changelog and creates the `v1.1.0` tag.

4. Wait for the **Release** workflow. The release page then has:

   | File                               | For                                                          |
   | ---------------------------------- | ------------------------------------------------------------ |
   | `lari-rates-<version>-chrome.zip`  | Chrome Web Store; Brave, Vivaldi and other Chromium browsers |
   | `lari-rates-<version>-firefox.zip` | Firefox Add-ons (AMO)                                        |
   | `lari-rates-<version>-edge.zip`    | Edge Add-ons                                                 |
   | `lari-rates-<version>-opera.zip`   | Opera Add-ons                                                |
   | `lari-rates-<version>-sources.zip` | Source code upload that AMO asks for when code is bundled    |
   | `SHA256SUMS.txt`                   | Checksums of the archives                                    |

Details worth knowing:

- The tag must equal the `package.json` version (`v1.1.0` ↔ `1.1.0`), otherwise the workflow stops.
- A tag with a suffix, for example `v1.1.0-beta.1`, is published as a pre-release.
- To build the same packages locally, run `pnpm zip:all`; they land in `.output/`.
- Uploading to the stores is still manual (below) until store API keys are configured.

## Firefox Add-ons (AMO)

1. Sign in at <https://addons.mozilla.org/developers/> and choose _Submit a New Add-on_.
2. Upload the `-firefox.zip`. When asked whether the code is minified or bundled, answer yes and
   upload the `-sources.zip`. Build instructions for the reviewer: `pnpm install && pnpm zip:firefox`
   with Node 22 and pnpm 11.
3. The add-on id is `lari-rates@katokdoescode` (`wxt.config.ts`). **Do not change it after the
   first upload** — AMO ties updates to it. Change it before the first upload if you want your
   own.
4. The manifest declares `data_collection_permissions: { required: ["none"] }`, matching
   [PRIVACY.md](../PRIVACY.md).

For a signed build that is not listed publicly (to install permanently on your own machines),
choose _On your own_ as the distribution channel; AMO returns a signed `.xpi`.

## Chrome Web Store

1. Register at the [developer dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time fee).
2. _New item_ → upload the `-chrome.zip`.
3. Justifications the form asks for:
   - **storage** — remembers the last currency and amount, caches rates locally.
   - **host permission `nbg.gov.ge`** — reads the National Bank of Georgia's public rates API,
     which does not allow cross-origin requests.
   - **Remote code** — none.
   - **Data usage** — no user data collected.
4. Link `PRIVACY.md` as the privacy policy and upload the images from `store/`
   (see [store/README.md](../store/README.md) for the listing texts and the list of files).

Edge Add-ons and Opera take their own zips (`-edge.zip`, `-opera.zip`); the code is the same as
the Chrome build.

## Automating store uploads later

`wxt submit` can upload to the stores from CI once API keys exist
(`pnpm exec wxt submit init`). Add it as a last step of `release.yml`, with the keys stored as
repository secrets.
