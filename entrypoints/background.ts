import { defineBackground } from 'wxt/utils/define-background';
import { BADGE_CONFIG, RULESET_METADATA } from '../src/constants';
import { formatBadgeCount, incrementBlockStats, getEnabledRulesets, setEnabledRulesets } from '../src/storage';
import { syncWhitelistToDynamicRules } from '../src/whitelist';
import { WhitelistManager } from '../src/background/whitelist-manager';
import { StatsManager } from '../src/background/stats-manager';
import type { MessageType, TabState } from '../src/shared/types';

async function getTabCount(tabId: number): Promise<number> {
  const key = `tab_${tabId}`;
  const data = await chrome.storage.session.get({ [key]: 0 });
  return Number(data[key]) || 0;
}

async function setTabCount(tabId: number, count: number): Promise<void> {
  const key = `tab_${tabId}`;
  await chrome.storage.session.set({ [key]: count });
}

export default defineBackground(() => {
  const whitelistManager = WhitelistManager.getInstance();
  const statsManager = StatsManager.getInstance();

  async function initBackground(): Promise<void> {
    try {
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_CONFIG.COLOR });
    } catch {}

    await syncWhitelistToDynamicRules().catch(console.error);

    // Bật tính năng tự động hiển thị số lượng chặn chuẩn Production của Chrome MV3
    try {
      if (chrome.declarativeNetRequest.setExtensionActionOptions) {
        await chrome.declarativeNetRequest.setExtensionActionOptions({
          displayActionCountAsBadgeText: true
        });
      }
    } catch {}
  }

  initBackground().catch(console.error);

  chrome.runtime.onInstalled.addListener(() => {
    initBackground().catch(console.error);
  });

  chrome.runtime.onStartup.addListener(() => {
    initBackground().catch(console.error);
  });

  // Tự động đồng bộ lại Dynamic Rules bất cứ khi nào danh sách Whitelist trong Storage thay đổi
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.whitelist || changes.blockads_whitelist)) {
      syncWhitelistToDynamicRules().catch(console.error);
    }
  });

  async function updateTabBadge(tabId: number, count: number): Promise<void> {
    if (tabId < 0) return;
    try {
      await chrome.action.setBadgeText({ tabId, text: formatBadgeCount(count) });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_CONFIG.COLOR });
    } catch {
      // Tab đã đóng
    }
  }

  // 1. Chế độ Developer Mode (Unpacked): Cập nhật tức thì qua onRuleMatchedDebug
  if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
      if (info.rule?.rulesetId === '_dynamic') return;
      const tabId = info.request?.tabId;
      if (tabId && tabId > 0) {
        const nextCount = (await getTabCount(tabId)) + 1;
        await setTabCount(tabId, nextCount);
        await updateTabBadge(tabId, nextCount);
        await statsManager.recordBlock(tabId);
      }
    });
  }

  // 2. Chế độ Production Fallback: Đồng bộ qua getMatchedRules khi Tab tải xong
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      await setTabCount(tabId, 0);
      await updateTabBadge(tabId, 0);
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
          await setTabCount(tabId, count);
          await updateTabBadge(tabId, count);
          await statsManager.setTabBlockedCount(tabId, count);
          await incrementBlockStats(count);
        }
      } catch {
        // Bỏ qua các tab hệ thống chrome:// hoặc edge://
      }
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(`tab_${tabId}`).catch(() => {});
    statsManager.removeTab(tabId);
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const count = await getTabCount(activeInfo.tabId);
    await updateTabBadge(activeInfo.tabId, count);
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

          let blockedCount = tabId ? await getTabCount(tabId) : 0;
          if (tabId && chrome.declarativeNetRequest?.getMatchedRules) {
            try {
              const matched = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
              const matchedTotal = matched?.rulesMatchedInfo?.length || 0;
              if (matchedTotal > blockedCount) {
                const delta = matchedTotal - blockedCount;
                blockedCount = matchedTotal;
                await setTabCount(tabId, blockedCount);
                await updateTabBadge(tabId, blockedCount);
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
