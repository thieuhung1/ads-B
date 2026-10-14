import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  Layers,
  Flame,
  CheckCircle2,
  MousePointerClick,
  Undo2,
  Sparkles,
  Sliders,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { TabState, BlockStats, WhitelistEntry } from '../../src/shared/types';

interface RulesetItem {
  id: string;
  name: string;
  description: string;
  rulesCount: number;
  enabled: boolean;
}

const TEST_SITES = [
  { name: 'VnExpress', domain: 'vnexpress.net' },
  { name: 'YouTube', domain: 'youtube.com' },
  { name: 'Facebook', domain: 'facebook.com' },
  { name: 'Dân Trí', domain: 'dantri.com.vn' },
  { name: '24h.com.vn', domain: '24h.com.vn' },
  { name: 'Kênh 14', domain: 'kenh14.vn' },
  { name: 'Tuổi Trẻ', domain: 'tuoitre.vn' },
  { name: 'ZingNews', domain: 'znews.vn' },
  { name: 'Tinh Tế', domain: 'tinhte.vn' },
  { name: 'GenK', domain: 'genk.vn' },
  { name: 'Shopee', domain: 'shopee.vn' },
  { name: 'Tiki', domain: 'tiki.vn' },
  { name: 'Google', domain: 'google.com' },
  { name: 'Reddit', domain: 'reddit.com' },
  { name: 'Twitter (X)', domain: 'x.com' },
  { name: 'Twitch', domain: 'twitch.tv' },
  { name: 'Cốc Cốc', domain: 'coccoc.com' },
  { name: 'Báo Mới', domain: 'baomoi.com' },
  { name: 'Vietcetera', domain: 'vietcetera.com' },
  { name: 'Spiderum', domain: 'spiderum.com' }
];

export default function App() {
  const [tabState, setTabState] = useState<TabState | null>(null);
  const [stats, setStats] = useState<BlockStats>({
    totalBlocked: 0,
    todayBlocked: 0,
    lastResetDate: '',
    byDomain: {}
  });
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [rulesets, setRulesets] = useState<RulesetItem[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'rulesets' | 'cosmetic' | 'whitelist' | 'test'>('status');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tempHiddenCount, setTempHiddenCount] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadData = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' });
      if (response?.success) {
        setTabState(response.tabState);
        setStats(response.stats);
        setWhitelist(response.whitelist);
      }

      // Lấy danh sách bộ lọc
      const rulesetRes = await chrome.runtime.sendMessage({ type: 'GET_RULESETS' });
      if (rulesetRes?.success) {
        setRulesets(rulesetRes.rulesets);
      }

      // Lấy trạng thái cosmetic filtering từ content script
      const cosmeticRes = await chrome.runtime.sendMessage({ type: 'GET_COSMETIC_STATUS' });
      if (cosmeticRes?.success) {
        setTempHiddenCount(cosmeticRes.tempSelectors?.length || 0);
      }
    } catch (err) {
      console.warn('Lỗi khi tải trạng thái:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCurrentDomain = async () => {
    if (!tabState?.domain) return;
    const willEnable = tabState.isWhitelisted;
    const res = await chrome.runtime.sendMessage({
      type: 'TOGGLE_DOMAIN_PROTECTION',
      domain: tabState.domain,
      enabled: willEnable
    });
    if (res?.success) {
      setTabState(prev => prev ? { ...prev, isWhitelisted: res.isWhitelisted } : null);
      showToast(willEnable ? `Đã bật bảo vệ cho ${tabState.domain}` : `Đã thêm ${tabState.domain} vào Whitelist`);
      loadData();
    }
  };

  const handleToggleRuleset = async (rulesetId: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    const res = await chrome.runtime.sendMessage({
      type: 'TOGGLE_RULESET',
      rulesetId,
      enabled: nextState
    });
    if (res?.success) {
      setRulesets(prev => prev.map(r => r.id === rulesetId ? { ...r, enabled: nextState } : r));
      showToast(`${nextState ? 'Đã bật' : 'Đã tắt'} bộ lọc ${rulesetId.replace('ruleset_', '')}`);
    }
  };

  const handleStartElementPicker = async () => {
    const res = await chrome.runtime.sendMessage({ type: 'START_TEMP_PICKER' });
    if (res?.success) {
      showToast('Đã kích hoạt con trỏ chọn phần tử!');
      window.close(); // Đóng popup để người dùng tương tác trực tiếp trên trang web
    } else {
      showToast(res?.error || 'Không thể kích hoạt picker');
    }
  };

  const handleResetTempHidden = async () => {
    const res = await chrome.runtime.sendMessage({ type: 'RESET_TEMP_HIDDEN' });
    if (res?.success) {
      setTempHiddenCount(0);
      showToast('Đã khôi phục các phần tử ẩn');
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    const res = await chrome.runtime.sendMessage({
      type: 'ADD_WHITELIST',
      domain: newDomain.trim()
    });
    if (res?.success) {
      setWhitelist(res.whitelist);
      setNewDomain('');
      showToast(`Đã thêm vào Whitelist`);
      loadData();
    }
  };

  const handleRemoveWhitelist = async (domain: string) => {
    const res = await chrome.runtime.sendMessage({
      type: 'REMOVE_WHITELIST',
      domain
    });
    if (res?.success) {
      setWhitelist(res.whitelist);
      showToast(`Đã xóa ${domain} khỏi Whitelist`);
      loadData();
    }
  };

  const handleClearWhitelist = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách Whitelist?')) return;
    const res = await chrome.runtime.sendMessage({ type: 'CLEAR_WHITELIST' });
    if (res?.success) {
      setWhitelist([]);
      showToast('Đã dọn sạch toàn bộ Whitelist');
      loadData();
    }
  };

  const openTestSite = (domain: string) => {
    chrome.tabs.create({ url: `https://${domain}` });
  };

  const isProtected = tabState?.domain ? !tabState.isWhitelisted : true;

  return (
    <div className="popup-container">
      {/* Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className={`shield-icon-wrapper ${isProtected ? 'shield-active' : 'shield-paused'}`}>
            {isProtected ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <div className="header-title-row">
              <h1 className="header-title">BlockAds 2.0</h1>
              <span className="badge-tag">ads-B</span>
            </div>
            <p className="header-subtitle">
              {isProtected ? 'Bảo vệ đang hoạt động' : 'Tạm dừng bảo vệ trang này'}
            </p>
          </div>
        </div>
        <button className="icon-button" onClick={loadData} title="Làm mới">
          <RefreshCw size={15} />
        </button>
      </header>

      {/* Tabs Navigation */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Trạng thái
        </button>
        <button
          className={`tab-btn ${activeTab === 'rulesets' ? 'active' : ''}`}
          onClick={() => setActiveTab('rulesets')}
        >
          Bộ lọc ({rulesets.filter(r => r.enabled).length}/{rulesets.length || 3})
        </button>
        <button
          className={`tab-btn ${activeTab === 'cosmetic' ? 'active' : ''}`}
          onClick={() => setActiveTab('cosmetic')}
        >
          Ẩn Element
        </button>
        <button
          className={`tab-btn ${activeTab === 'whitelist' ? 'active' : ''}`}
          onClick={() => setActiveTab('whitelist')}
        >
          Whitelist ({whitelist.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Test 20 trang
        </button>
      </nav>

      {/* TAB 1: STATUS & CONTROLS */}
      {activeTab === 'status' && (
        <div className="tab-content">
          {/* Current Domain Card */}
          <div className="card domain-card">
            <div className="domain-info">
              <div className="domain-left">
                <Globe size={18} className="domain-globe-icon" />
                <div className="domain-text">
                  <div className="domain-label">Trang hiện tại</div>
                  <div className="domain-name" title={tabState?.domain || 'Trình duyệt'}>
                    {tabState?.domain || 'Trang mặc định'}
                  </div>
                </div>
              </div>

              {tabState?.domain && (
                <button
                  className={`toggle-switch-btn ${isProtected ? 'btn-active' : 'btn-whitelisted'}`}
                  onClick={handleToggleCurrentDomain}
                >
                  <span className="toggle-indicator"></span>
                  <span className="toggle-text">{isProtected ? 'Đang Chặn' : 'Bỏ Qua'}</span>
                </button>
              )}
            </div>

            {tabState?.domain && (
              <div className="domain-status-footer">
                <span className="status-dot-pulse"></span>
                <span className="domain-blocked-text">
                  Đã chặn <strong>{tabState.blockedCount}</strong> request rác trên tab này
                </span>
              </div>
            )}
          </div>

          {/* Quick Action: Element Picker */}
          <button className="quick-action-btn" onClick={handleStartElementPicker}>
            <MousePointerClick size={16} />
            <span>Chọn & Ẩn phần tử bất kỳ trên trang</span>
          </button>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-box">
              <div className="metric-icon metric-today">
                <Flame size={18} />
              </div>
              <div className="metric-data">
                <div className="metric-number">{stats.todayBlocked.toLocaleString()}</div>
                <div className="metric-title">Hôm nay</div>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-icon metric-total">
                <Layers size={18} />
              </div>
              <div className="metric-data">
                <div className="metric-number">{stats.totalBlocked.toLocaleString()}</div>
                <div className="metric-title">Tổng cộng</div>
              </div>
            </div>
          </div>

          {/* Rulesets Info */}
          <div className="card rulesets-card">
            <div className="rulesets-header">
              <span className="rulesets-title">Bộ lọc quy tắc DNR & Cosmetic</span>
              <span className="rulesets-count">500+ DNR Rules</span>
            </div>
            <div className="ruleset-items">
              <div className="ruleset-pill">
                <CheckCircle2 size={13} className="pill-check" />
                <span>Cosmetic Engine: <strong>Tự động xóa khung trắng</strong></span>
              </div>
              <div className="ruleset-pill">
                <CheckCircle2 size={13} className="pill-check" />
                <span>Clean Architecture: <strong>Không Race Condition & 0% CPU</strong></span>
              </div>
              <div className="ruleset-pill">
                <CheckCircle2 size={13} className="pill-check" />
                <span>Dynamic Whitelist: <strong>Đồng bộ nguyên tử 10000-19999</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULESETS MANAGEMENT */}
      {activeTab === 'rulesets' && (
        <div className="tab-content">
          <div className="rulesets-management">
            <div className="ruleset-intro">
              <Sliders size={18} className="intro-icon" />
              <p>Bật hoặc tắt độc lập từng bộ lọc quy tắc tĩnh Declarative Net Request:</p>
            </div>

            <div className="ruleset-cards-list">
              {rulesets.map((r) => (
                <div key={r.id} className={`ruleset-card ${r.enabled ? 'ruleset-enabled' : 'ruleset-disabled'}`}>
                  <div className="ruleset-card-info">
                    <div className="ruleset-card-title-row">
                      <span className="ruleset-card-title">{r.name}</span>
                      <span className="ruleset-badge-count">{r.rulesCount} rules</span>
                    </div>
                    <p className="ruleset-card-desc">{r.description}</p>
                  </div>
                  <button
                    className={`ruleset-toggle-btn ${r.enabled ? 'active' : ''}`}
                    onClick={() => handleToggleRuleset(r.id, r.enabled)}
                    title={r.enabled ? 'Tắt bộ lọc này' : 'Bật bộ lọc này'}
                  >
                    {r.enabled ? <ToggleRight size={28} className="toggle-icon-on" /> : <ToggleLeft size={28} className="toggle-icon-off" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COSMETIC FILTERING CONTROLS */}
      {activeTab === 'cosmetic' && (
        <div className="tab-content">
          <div className="card cosmetic-card">
            <div className="cosmetic-card-header">
              <Sparkles size={20} className="cosmetic-icon" />
              <div>
                <h3 className="cosmetic-title">Cosmetic Filtering (Lọc Thẩm Mỹ)</h3>
                <p className="cosmetic-desc">
                  Ẩn sạch sẽ các banner, khung rỗng và khoảng trống quảng cáo còn sót lại bằng Pure Declarative CSS Injection.
                </p>
              </div>
            </div>

            <div className="cosmetic-actions">
              <button className="primary-action-btn" onClick={handleStartElementPicker}>
                <MousePointerClick size={16} />
                <span>Bật con trỏ chọn phần tử (Element Picker)</span>
              </button>

              {tempHiddenCount > 0 ? (
                <button className="secondary-action-btn" onClick={handleResetTempHidden}>
                  <Undo2 size={15} />
                  <span>Khôi phục {tempHiddenCount} phần tử đã ẩn tạm thời</span>
                </button>
              ) : (
                <div className="cosmetic-hint">
                  💡 Nhấp vào nút trên, sau đó di chuột và click vào bất kỳ phần tử phiền toái nào trên trang web để ẩn tức thì.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WHITELIST MANAGER */}
      {activeTab === 'whitelist' && (
        <div className="tab-content">
          <form className="add-whitelist-form" onSubmit={handleAddWhitelist}>
            <input
              type="text"
              placeholder="Nhập domain (vd: dantri.com.vn)..."
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="whitelist-input"
            />
            <button type="submit" className="add-btn" disabled={!newDomain.trim()}>
              <Plus size={16} /> Thêm
            </button>
          </form>

          <div className="whitelist-header-row">
            <span className="whitelist-subheading">
              Các trang web được miễn trừ ({whitelist.length})
            </span>
            {whitelist.length > 0 && (
              <button className="clear-all-btn" onClick={handleClearWhitelist}>
                Xóa toàn bộ
              </button>
            )}
          </div>

          <div className="whitelist-list">
            {whitelist.length === 0 ? (
              <div className="empty-state">
                <ShieldCheck size={28} className="empty-icon" />
                <p>Danh sách loại trừ đang trống.</p>
                <span className="empty-subtext">Mọi trang web đều được bảo vệ toàn diện</span>
              </div>
            ) : (
              whitelist.map((item) => (
                <div key={item.domain} className="whitelist-item">
                  <div className="whitelist-domain-info">
                    <Globe size={14} className="whitelist-globe" />
                    <span className="whitelist-domain-name">{item.domain}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleRemoveWhitelist(item.domain)}
                    title="Xóa khỏi danh sách"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TEST 20 POPULAR SITES */}
      {activeTab === 'test' && (
        <div className="tab-content">
          <div className="test-header">
            <span>Click để mở và kiểm thử khả năng chặn quảng cáo:</span>
          </div>
          <div className="test-sites-grid">
            {TEST_SITES.map((site) => (
              <button
                key={site.domain}
                className="test-site-btn"
                onClick={() => openTestSite(site.domain)}
              >
                <span className="site-name">{site.name}</span>
                <ExternalLink size={12} className="external-icon" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-left">
          <span className="footer-status-indicator"></span>
          <span>DNR + Cosmetic Engine</span>
        </div>
        <span className="footer-version">v2.0 (Clean Architecture)</span>
      </footer>
    </div>
  );
}
