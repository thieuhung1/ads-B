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
  Sparkles
} from 'lucide-react';
import type { TabState, BlockStats, WhitelistEntry } from '../../src/shared/types';

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
  const [newDomain, setNewDomain] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'cosmetic' | 'whitelist' | 'test'>('status');
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
    const interval = setInterval(loadData, 2000);
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

  const handleStartElementPicker = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'START_TEMP_PICKER' });
      if (res?.success) {
        // Đóng popup để người dùng tương tác ngay với trang web
        window.close();
      } else {
        showToast(res?.error || 'Không thể kích hoạt picker');
      }
    } catch {
      showToast('Không thể kết nối tới trang này');
    }
  };

  const handleResetTempHidden = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'RESET_TEMP_HIDDEN' });
      if (res?.success) {
        setTempHiddenCount(0);
        showToast('Đã khôi phục các phần tử ẩn');
      }
    } catch {
      showToast('Không thể kết nối tới trang');
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
      showToast(`Đã thêm ${newDomain.trim()} vào Whitelist`);
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
              <span className="badge-tag">v2.0</span>
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
              <span className="rulesets-count">500 DNR + CSS</span>
            </div>
            <div className="ruleset-items">
              <div className="ruleset-pill">
                <CheckCircle2 size={13} className="pill-check" />
                <span>Cosmetic Engine: <strong>Tự động xóa khung trắng</strong></span>
              </div>
              <div className="ruleset-pill">
                <CheckCircle2 size={13} className="pill-check" />
                <span>MutationObserver: <strong>Bắt quảng cáo động</strong></span>
              </div>
              <div className="ruleset-pill">
                <CheckCircle2 size={13} className="pill-check" />
                <span>DNR Rules: <strong>500 rules (EasyList, Privacy, ABPVN)</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COSMETIC FILTERING CONTROLS */}
      {activeTab === 'cosmetic' && (
        <div className="tab-content">
          <div className="card cosmetic-card">
            <div className="cosmetic-card-header">
              <Sparkles size={20} className="cosmetic-icon" />
              <div>
                <h3 className="cosmetic-title">Cosmetic Filtering</h3>
                <p className="cosmetic-desc">
                  Ẩn sạch sẽ các banner, khung rỗng và khoảng trống quảng cáo còn sót lại bằng CSS Injection.
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

      {/* TAB 3: WHITELIST MANAGER */}
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
                <small>Toàn bộ bộ lọc đang được áp dụng đầy đủ.</small>
              </div>
            ) : (
              whitelist.map((item) => (
                <div key={item.domain} className="whitelist-item">
                  <div className="whitelist-domain-info">
                    <span className="whitelist-domain-name">{item.domain}</span>
                    <span className="whitelist-date">
                      {new Date(item.addedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <button
                    className="delete-item-btn"
                    onClick={() => handleRemoveWhitelist(item.domain)}
                    title={`Xóa ${item.domain} khỏi Whitelist`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TEST 20 TRANG PHỔ BIẾN */}
      {activeTab === 'test' && (
        <div className="tab-content">
          <div className="test-intro">
            Kiểm tra hiệu quả chặn quảng cáo và cosmetic filtering trên 20 website:
          </div>
          <div className="test-sites-grid">
            {TEST_SITES.map((site) => (
              <button
                key={site.domain}
                className="test-site-btn"
                onClick={() => openTestSite(site.domain)}
              >
                <span className="test-site-name">{site.name}</span>
                <ExternalLink size={12} className="test-site-ext" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <span>BlockAds 2.0 • DNR + Cosmetic Engine</span>
      </footer>
    </div>
  );
}
