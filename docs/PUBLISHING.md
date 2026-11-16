# Releasing and publishing

## Cut a release

1. Make sure `main` is green: `pnpm check`.
2. Bump `version` in `package.json` (WXT copies it into the manifest) and move the
   `Unreleased` notes in `CHANGELOG.md` under the new version.
3. Commit, tag and push:

   ```bash
   git commit -am "chore: release v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```

4. Build the packages:

   ```bash
   pnpm zip:all
   ```

   | File in `.output/`                 | For                                                       |
   | ---------------------------------- | --------------------------------------------------------- |
   | `lari-rates-<version>-chrome.zip`  | Chrome Web Store, Edge Add-ons, Opera                     |
   | `lari-rates-<version>-firefox.zip` | Firefox Add-ons (AMO)                                     |
   | `lari-rates-<version>-sources.zip` | Source code upload that AMO asks for when code is bundled |

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

## Automating later

`wxt submit` can upload to all stores from CI once API keys exist
(`pnpm exec wxt submit init`). The CI workflow already builds and attaches both zips to every
run, so a release job only needs the upload step.
