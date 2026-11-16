import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
    developmentIndicator: false,
  },
  zip: {
    // Keep the AMO source archive to what is needed to rebuild the extension.
    excludeSources: ['store/**', 'docs/**', 'scripts/**', 'coverage/**'],
  },
  manifest: ({ browser, manifestVersion }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    // The NBG API sends no CORS headers, so the popup needs host access to read it.
    host_permissions: ['https://nbg.gov.ge/*'],
    commands: {
      [manifestVersion === 2 ? '_execute_browser_action' : '_execute_action']: {
        suggested_key: { default: 'Alt+Shift+L' },
      },
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'lari-rates@katokdoescode',
          strict_min_version: '115.0',
          data_collection_permissions: { required: ['none'] },
        },
      },
    }),
  }),
});
