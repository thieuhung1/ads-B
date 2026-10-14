import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BlockAds 2.0 - Fast & Private Ad Blocker',
    description: 'Chặn banner quảng cáo, popups và trackers theo dõi với Declarative Net Request MV3.',
    version: '1.0.0',
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png'
    },
    action: {
      default_title: 'BlockAds 2.0',
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png'
      }
    },
    permissions: [
      'declarativeNetRequest',
      'declarativeNetRequestFeedback',
      'storage',
      'tabs',
      'activeTab'
    ],
    host_permissions: ['<all_urls>'],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'ruleset_easylist',
          enabled: true,
          path: 'rules/ruleset-easylist.json'
        },
        {
          id: 'ruleset_easyprivacy',
          enabled: true,
          path: 'rules/ruleset-easyprivacy.json'
        },
        {
          id: 'ruleset_abpvn',
          enabled: true,
          path: 'rules/ruleset-abpvn.json'
        }
      ]
    }
  }
});
