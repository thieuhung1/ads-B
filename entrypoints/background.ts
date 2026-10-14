import { defineBackground } from 'wxt/utils/define-background';
import { WhitelistManager } from '../src/background/whitelist-manager';
import { StatsManager } from '../src/background/stats-manager';
import { BADGE_CONFIG, RULESET_METADATA } from '../src/constants';
import { getEnabledRulesets, setEnabledRulesets, incrementBlockStats } from '../src/storage';
import type { MessageType, TabState } from '../src/shared/types';

export default defineBackground(() => {
  const whitelistManager = WhitelistManager.getInstance();
  const statsManager = StatsManager.getInstance();

  console.log('[BlockAds 2.0] Service Worker khởi động (Manifest V3 Production-Ready).');

  async function initializeExtension() {
    try {
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_CONFIG.ALERT_COLOR });
    } catch {}

    await whitelistManager.syncDynamicRules().catch(console.error);

    // SỬA BUG 1: Bật tính năng tự động hiển thị số lượng chặn chuẩn Production của Chrome MV3
    try {
      if (chrome.declarativeNetRequest?.setExtensionActionOptions) {
        await chrome.declarativeNetRequest.setExtensionActionOptions({
          displayActionCountAsBadgeText: true
        });
      }
    } catch {}
  }

  // Khởi tạo ngay khi Service Worker thức dậy
  initializeExtension().catch(console.error);

  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[BlockAds 2.0] onInstalled:', details.reason);
    await initializeExtension();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await initializeExtension();
  });

  // 1. Chế độ Developer Mode (Unpacked): Cập nhật tức thì qua onRuleMatchedDebug
  if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
      if (info.rule?.rulesetId === '_dynamic') return;
      const tabId = info.request?.tabId;
      if (tabId && tabId > 0) {
        await statsManager.recordBlock(tabId);
      }
    });
  }

  // 2. Chế độ Production Fallback: Đồng bộ qua getMatchedRules khi Tab tải xong
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      statsManager.resetTab(tabId);
    } else if (
      changeInfo.status === 'complete' &&
      !chrome.declarativeNetRequest?.onRuleMatchedDebug &&
      chrome.declarativeNetRequest?.getMatchedRules
    ) {
      try {
        const matched = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
        const count = matched?.rulesMatchedInfo?.length || 0;
        if (count > 0) {
          const currentCount = await statsManager.getTabBlockedCountAsync(tabId);
          if (count > currentCount) {
            const delta = count - currentCount;
            await statsManager.setTabBlockedCount(tabId, count);
            await incrementBlockStats(delta);
          }
        }
      } catch {
        // Tab hệ thống hoặc không có quyền truy cập
      }
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    statsManager.removeTab(tabId);
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const count = await statsManager.getTabBlockedCountAsync(activeInfo.tabId);
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
              // Tab có thể đã đóng
            }
          }

          const rawUrl = sender.url || currentTab?.url || '';
          const domain = whitelistManager.normalizeDomain(rawUrl);
          const isWhitelisted = domain ? await whitelistManager.isWhitelisted(domain) : false;

          let blockedCount = tabId ? await statsManager.getTabBlockedCountAsync(tabId) : 0;
          if (tabId && chrome.declarativeNetRequest?.getMatchedRules) {
            try {
              const matched = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
              const matchedTotal = matched.rulesMatchedInfo?.length || 0;
              if (matchedTotal > blockedCount) {
                const delta = matchedTotal - blockedCount;
                blockedCount = matchedTotal;
                await statsManager.setTabBlockedCount(tabId, blockedCount);
                await incrementBlockStats(delta);
              }
            } catch {
              // Ignored
            }
          }

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

          // Thông báo cho content script của active tab
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              await chrome.tabs.sendMessage(activeTab.id, {
                type: 'TOGGLE_COSMETIC',
                enabled: !isWhitelisted
              });
            } catch {
              // Content script chưa được nạp
            }
          }

          sendResponse({ success: true, isWhitelisted });
          break;
        }

        case 'GET_RULESETS': {
          const enabledList = await getEnabledRulesets();
          const rulesets = Object.values(RULESET_METADATA).map((r) => ({
            ...r,
            enabled: enabledList.includes(r.id)
          }));
          sendResponse({ success: true, rulesets });
          break;
        }

        case 'TOGGLE_RULESET': {
          const { rulesetId, enabled } = message;
          const current = await getEnabledRulesets();
          let updated: string[];

          if (enabled) {
            updated = Array.from(new Set([...current, rulesetId]));
            await chrome.declarativeNetRequest.updateEnabledRulesets({
              enableRulesetIds: [rulesetId]
            });
          } else {
            updated = current.filter((id) => id !== rulesetId);
            await chrome.declarativeNetRequest.updateEnabledRulesets({
              disableRulesetIds: [rulesetId]
            });
          }

          await setEnabledRulesets(updated);
          sendResponse({ success: true, enabledRulesets: updated });
          break;
        }

        case 'START_TEMP_PICKER': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            try {
              const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'START_TEMP_PICKER' });
              sendResponse(res || { success: true });
            } catch {
              sendResponse({ success: false, error: 'Không thể kích hoạt picker trên tab này.' });
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
