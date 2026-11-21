import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'B站总结',
  version: '0.1.0',
  description: '提取当前 B 站视频的字幕，整理成一句话、要点和时间线。',
  minimum_chrome_version: '116',
  permissions: ['sidePanel', 'storage', 'cookies', 'tabs', 'scripting'],
  host_permissions: [
    'https://www.bilibili.com/*',
    'https://bilibili.com/*',
    'https://m.bilibili.com/*',
    'https://api.bilibili.com/*',
    'https://*.hdslb.com/*',
    'https://api.deepseek.com/*',
    'https://api.moonshot.cn/*',
    'https://api.openai.com/*',
  ],
  optional_host_permissions: ['https://*/*'],
  action: {
    default_title: '总结这个视频',
    default_icon: {
      16: 'public/icons/icon16.png',
      32: 'public/icons/icon32.png',
      48: 'public/icons/icon48.png',
    },
  },
  icons: {
    16: 'public/icons/icon16.png',
    32: 'public/icons/icon32.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ['https://www.bilibili.com/video/*', 'https://bilibili.com/video/*', 'https://m.bilibili.com/video/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})
