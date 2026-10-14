import { defineBackground } from 'wxt/utils/define-background';
import { WhitelistManager } from '../src/background/whitelist-manager';
import { StatsManager } from '../src/background/stats-manager';
import type { MessageType, TabState } from '../src/shared/types';

export default defineBackground(() => {
  const whitelistManager = WhitelistManager.getInstance();
  const statsManager = StatsManager.getInstance();

  console.log('[BlockAds 2.0] Service Worker khởi động thành công.');

  // Khởi tạo và đồng bộ dynamic rules
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[BlockAds 2.0] onInstalled:', details.reason);
    await whitelistManager.syncDynamicRules();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await whitelistManager.syncDynamicRules();
  });

  // Lắng nghe sự kiện matched rule khi có declarativeNetRequestFeedback (unpacked dev mode)
  if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
      const tabId = info.request?.tabId;
      if (info.rule?.rulesetId) {
        statsManager.recordBlock(tabId);
      }
    });
  }

  // Polling định kỳ bằng getMatchedRules để đảm bảo badge luôn chính xác
  let lastMatchedCount = 0;
  async function pollMatchedRules() {
    try {
      if (chrome.declarativeNetRequest?.getMatchedRules) {
        const result = await chrome.declarativeNetRequest.getMatchedRules({});
        const currentCount = result.rulesMatchedInfo?.length || 0;
        if (currentCount > lastMatchedCount) {
          const diff = currentCount - lastMatchedCount;
          lastMatchedCount = currentCount;

          // Lấy active tab hiện tại để cập nhật
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            for (let i = 0; i < diff; i++) {
              await statsManager.recordBlock(activeTab.id);
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  setInterval(pollMatchedRules, 3000);

  // Quản lý Tabs
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
      statsManager.resetTab(tabId);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    statsManager.removeTab(tabId);
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const count = statsManager.getTabBlockedCount(activeInfo.tabId);
    await statsManager.updateTabBadge(activeInfo.tabId, count);
  });

  // Message Handler từ Popup và Content Scripts
  chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
    (async () => {
      switch (message.type) {
        case 'GET_TAB_STATE': {
          let tabId = message.tabId || sender.tab?.id;
          let currentTab: chrome.tabs.Tab | undefined = sender.tab;

          if (!tabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            currentTab = tabs[0];
            tabId = currentTab?.id;
          } else if (!currentTab) {
            try {
              currentTab = await chrome.tabs.get(tabId);
            } catch {
              // Tab not found
            }
          }

          const rawUrl = sender.url || currentTab?.url || '';
          const domain = whitelistManager.normalizeDomain(rawUrl);
          const isWhitelisted = domain ? await whitelistManager.isWhitelisted(domain) : false;
          const blockedCount = tabId ? statsManager.getTabBlockedCount(tabId) : 0;

          const tabState: TabState = {
            tabId: tabId || 0,
            url: rawUrl,
            domain,
            isWhitelisted,
            blockedCount
          };

          const stats = await statsManager.getStats();
          const whitelist = await whitelistManager.getWhitelist();

          sendResponse({ success: true, tabState, stats, whitelist });
          break;
        }

        case 'TOGGLE_DOMAIN_PROTECTION': {
          const { domain, enabled } = message;
          if (enabled) {
            await whitelistManager.removeDomain(domain);
          } else {
            await whitelistManager.addDomain(domain);
          }
          const isWhitelisted = await whitelistManager.isWhitelisted(domain);

          // Thông báo cho content script của active tab biết để bật/tắt cosmetic CSS
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              await chrome.tabs.sendMessage(activeTab.id, {
                type: 'TOGGLE_COSMETIC',
                enabled: !isWhitelisted
              });
            } catch {
              // Content script might not be injected yet
            }
          }

          sendResponse({ success: true, isWhitelisted });
          break;
        }

        case 'START_TEMP_PICKER': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'START_TEMP_PICKER' });
              sendResponse(res || { success: true });
            } catch (err: any) {
              sendResponse({ success: false, error: 'Không thể kích hoạt picker trên tab này (có thể là trang nội bộ trình duyệt).' });
            }
          } else {
            sendResponse({ success: false, error: 'Không tìm thấy tab đang mở.' });
          }
          break;
        }

        case 'RESET_TEMP_HIDDEN': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'RESET_TEMP_HIDDEN' });
              sendResponse(res || { success: true });
            } catch (err: any) {
              sendResponse({ success: false, error: err.message });
            }
          }
          break;
        }

        case 'GET_COSMETIC_STATUS': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_COSMETIC_STATUS' });
              sendResponse(res || { success: false });
            } catch {
              sendResponse({ success: false });
            }
          }
          break;
        }

        case 'GET_WHITELIST': {
          const list = await whitelistManager.getWhitelist();
          sendResponse({ success: true, whitelist: list });
          break;
        }

        case 'ADD_WHITELIST': {
          const list = await whitelistManager.addDomain(message.domain);
          sendResponse({ success: true, whitelist: list });
          break;
        }

        case 'REMOVE_WHITELIST': {
          const list = await whitelistManager.removeDomain(message.domain);
          sendResponse({ success: true, whitelist: list });
          break;
        }

        case 'CLEAR_WHITELIST': {
          await whitelistManager.clearAll();
          sendResponse({ success: true, whitelist: [] });
          break;
        }

        case 'GET_STATS': {
          const stats = await statsManager.getStats();
          sendResponse({ success: true, stats });
          break;
        }

        case 'RESET_STATS': {
          await statsManager.resetStats();
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    })();

    return true;
  });
});
