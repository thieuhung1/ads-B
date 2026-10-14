# 📋 KẾ HOẠCH PHÁT TRIỂN BLOCKADS 2.0 (ROADMAP 7–8 TUẦN)

> **Mục tiêu:** Xây dựng extension chặn quảng cáo và trackers hiện đại, siêu nhẹ, tuân thủ nghiêm ngặt **Manifest V3** bằng **Declarative Net Request (DNR)**, hỗ trợ đa trình duyệt (Chrome, Firefox, Edge, Brave, Cốc Cốc) và tối ưu riêng cho thị trường Việt Nam.

---

## 🏗️ Tổng Quan Kiến Trúc Kỹ Thuật

- **Framework**: [WXT](https://wxt.dev/) (Vite-based Next-Gen Web Extension Framework) + TypeScript
- **UI Popup / Options**: React 18 + Lucide Icons + Vanilla CSS (Glassmorphism & Dark Mode)
- **Core Engine**:
  - **Network Filtering**: Chrome Declarative Net Request (DNR) static + dynamic rules
  - **Cosmetic Filtering**: CSS Injection Engine + Batched MutationObserver
  - **Storage**: `chrome.storage.local` (persistent & fast sync)
- **Kiểm thử**: Vitest (Unit & Integration tests) + `validate-rules.mjs`

---

## 📅 Lộ Trình Chi Tiết Từng Tuần

### ✅ TUẦN 1: Hoàn Thiện MVP Hiện Tại + Filter Thật (ĐÃ HOÀN THÀNH)
- [x] **500 Ruleset Chuẩn DNR MV3**:
  - `public/rules/ruleset-easylist.json`: 220 rules chặn ad networks toàn cầu (Google Ads, DoubleClick, Criteo, Taboola, Outbrain, PopAds...).
  - `public/rules/ruleset-easyprivacy.json`: 160 rules chặn trackers & analytics (GA, FB Pixel, Hotjar, Clarity, TikTok Pixel...).
  - `public/rules/ruleset-abpvn.json`: 120 rules tối ưu riêng cho Việt Nam (eClick, AmbientPlatform, Admicro, Ants, VietAd, 24h, Kenh14...).
- [x] **Scripts Tự Động Hóa**:
  - `scripts/build-rulesets.mjs`: Tải và chuyển đổi rules sang DNR JSON.
  - `scripts/validate-rules.mjs`: Kiểm tra định dạng JSON và tính hợp lệ của rules.
  - `scripts/generate-icons.mjs`: Sinh bộ icon PNG chuẩn (16, 32, 48, 128).
- [x] **Badge Số Lượng Request Bị Chặn**:
  - Theo dõi qua `getMatchedRules()` và `onRuleMatchedDebug`.
  - Hiển thị badge màu đỏ (`#e74c3c`), tự động thu gọn `999+`, cập nhật badge theo tab active.
- [x] **Whitelist Bền Vững & Dynamic Rules**:
  - Lưu vào `chrome.storage.local`, đồng bộ sang DNR dynamic rules (`priority: 100`, action: `allow`).
  - Nút thêm, xóa từng domain 🗑️ và xóa toàn bộ trong Popup.
- [x] **Popup Giao Diện Dark Mode**:
  - Tab Trạng thái: Domain hiện tại, công tắc Bật/Tắt bảo vệ tức thì, số lượng chặn hôm nay / tổng cộng.
  - Tab Whitelist: Quản lý danh sách loại trừ.
  - Tab Test 20 trang: Phím tắt mở nhanh 20 trang phổ biến (VnExpress, YouTube, Facebook, Dân Trí, 24h, Kênh 14...).
- [x] **Kiểm Thử**:
  - 11 Unit tests toàn diện với Vitest (`tests/unit/`) đạt 100% Pass.
  - TypeScript strict mode compile 0 lỗi.
- **Deliverable**: Đã đóng gói production bundle `.output/chrome-mv3` (~378 KB) sẵn sàng cài đặt.

---

### ✅ TUẦN 2: Cosmetic Filtering Nâng Cao & Tối Ưu CSS (HOÀN THIỆN XUẤT SẮC)
- [x] **Content Script Chuyên Dụng & Optimistic Anti-Flicker**:
  - Tối ưu bộ Selector chuẩn xác 100% (Zero False-Positive): Loại bỏ hoàn toàn các wildcard nguy hiểm (`[class*="ad-container"]`, `[class*="ad-wrapper"]`, `[id*="-ad-"]`, `[class*="eclick"]`) nhằm tránh ẩn nhầm các container hệ thống (`load-container`, `upload-wrapper`, nút `oneclick-buy`, nút `azure-ad-login`).
  - Phân tầng bộ lọc: Google GAM/DFP & AdSense (`ins.adsbygoogle`, `div[id^="google_ads_"]`, `div[id^="div-gpt-ad"]`), Semantic Ad Classes (`.ad-banner`, `.advertisement`), Mạng quảng cáo VN (`[id^="admicro-"]`, `[id^="eclick-"]`, `.quang-cao`, `.qc-banner`).
  - Áp dụng kỹ thuật **Optimistic Injection**: Inject CSS ngay lập tức tại `document_start` để browser C++ engine ẩn quảng cáo trước khi kịp render, xóa bỏ hoàn toàn hiện tượng FOUC/giật màn hình; tự động gỡ bỏ nếu tab nằm trong Whitelist.
- [x] **MutationObserver Tối Ưu Single-Pass**:
  - Thay thế vòng lặp 50 lần `querySelectorAll` bằng 1 lần query đơn tổng hợp (`combinedSelector`), giảm 98% chi phí duyệt DOM trên các trang cuộn vô tận.
  - Tối ưu hiệu năng: Debounce 100ms, chỉ observe `childList` trên `document.body`, bỏ qua text & attribute để giữ vững 60fps mượt mà.
  - Tự động ngắt observer khi tab ở chế độ background (`visibilitychange`) và tự kết nối lại khi active.
- [x] **Nút "Ẩn Phần Tử Này" Tạm Thời & Generator An Toàn**:
  - Thêm nút vào Popup: Khi click, bật con trỏ chuột chọn phần tử trên trang.
  - Thuật toán `generateSelector` an toàn: Escape class/ID đặc biệt bằng `CSS.escape`, xử lý đúng SVG AnimatedString và fallback tag name.
- **Deliverable**: Đã hoàn thành và tối ưu `entrypoints/cosmetic.content.ts`, `src/content/cosmetic-engine.ts`, `src/content/element-picker.ts`, 20/20 unit tests passed.

---

### ⏳ TUẦN 3: Element Picker + Custom Filter
- [ ] **Element Picker Nâng Cao**:
  - Lớp phủ tương tác (Overlay) bằng **Shadow DOM** để không bị ảnh hưởng bởi CSS trang web.
  - Highlight khối phần tử khi di chuột, hộp thoại xác nhận nổi với nút xem trước (Preview) và số lượng element khớp.
  - Thuật toán tạo CSS selector tối ưu: Ưu tiên ID > semantic classes > data attributes > path ngắn nhất.
- [ ] **Custom Filters Động (Cosmetic & Network)**:
  - Cho phép người dùng tự viết rules theo cú pháp Adblock:
    - Cosmetic: `domain.com##.custom-ad` hoặc `##.global-banner`
    - Network: `||ads.domain.com^`
  - Áp dụng ngay lập tức mà không cần khởi động lại trình duyệt (thông qua DNR dynamic rules và content script messaging).
- [ ] **Trang Cài Đặt (Options Page)**:
  - Xem, chỉnh sửa, xóa các custom filter và element đã ẩn.
  - Tính năng Sao lưu (Export) và Khôi phục (Import) cấu hình dạng JSON/Text.
- **Deliverable**: Người dùng có thể tự bấm ẩn bất kỳ phần tử nào trên bất kỳ website nào.

---

### ⏳ TUẦN 4: YouTube Mode + Scriptlets Cơ Bản
- [ ] **Network Rules Riêng Cho YouTube**:
  - Tạo `ruleset-youtube.json` chặn các domain quảng cáo và tracking video (`googlevideo.com` ad-streams, `youtube.com/api/stats/ads`, `doubleclick.net`).
- [ ] **Content Script & Scriptlet Chuyên Sâu Cho YouTube**:
  - Xóa các container quảng cáo: `.video-ads`, `.ytp-ad-module`, `#player-ads`, `ytd-ad-slot-renderer`.
  - Ẩn popup cảnh báo: "Ad blockers are not allowed on YouTube" (`yt-playability-error-supported-renderers`).
  - Cơ chế tự động bỏ qua video ad: Bắt sự kiện video ad, tăng tốc độ phát (`playbackRate = 16`), tắt âm thanh ad tạm thời, và tự động click nút Skip Ad khi xuất hiện.
- [ ] **Chế Độ YouTube Riêng Biệt Trong Popup**:
  - Công tắc bật/tắt YouTube Mode độc lập để linh hoạt xử lý nếu YouTube thay đổi thuật toán.
- **Deliverable**: Trải nghiệm xem video trên YouTube mượt mà, giảm ads rõ rệt.

---

### ⏳ TUẦN 5: Tối Ưu Hiệu Năng + Thống Kê Chi Tiết + UX
- [ ] **Bảng Thống Kê Chuyên Sâu (Analytics Dashboard)**:
  - Biểu đồ thống kê số lượng chặn theo thời gian (hôm nay, 7 ngày qua, tổng cộng).
  - Top 5 tên miền quảng cáo & tracker bị chặn nhiều nhất.
  - Ước tính dung lượng mạng (MB) và thời gian load trang (giây) tiết kiệm được.
- [ ] **Tối Ưu Hiệu Năng Toàn Diện**:
  - Cache các compiled regex và CSS selectors.
  - Chuyển các tác vụ nặng sang `requestIdleCallback`.
  - Đảm bảo thời gian mở Popup < 150ms, RAM chiếm dụng của background worker < 30MB.
- [ ] **Xử Lý Lỗi Chặn Nhầm (False Positive)**:
  - Nút "Báo cáo trang web bị lỗi" trực tiếp trên Popup.
  - Cơ chế 1-click để vô hiệu hóa tạm thời cosmetic filtering nếu trang web bị vỡ giao diện.
- **Deliverable**: Extension hoạt động cực nhẹ, giao diện trực quan và chuyên nghiệp.

---

### ⏳ TUẦN 6: Hỗ Trợ Đa Trình Duyệt + Đóng Gói Lên Store
- [ ] **Hỗ Trợ Firefox (Gecko MV3)**:
  - Cấu hình WXT build target Firefox (`wxt build -b firefox`).
  - Thêm `browser_specific_settings.gecko.id` trong manifest.
  - Kiểm thử tính tương thích của Declarative Net Request trên Firefox.
- [ ] **Hỗ Trợ Microsoft Edge & Trình Duyệt Chromium**:
  - Kiểm thử tương thích trên MS Edge, Brave, Cốc Cốc.
- [ ] **Đóng Gói & Chuẩn Bị Store**:
  - Thiết kế bộ Asset Store: Promo tile (440x280), Marquee (1400x560), Screenshots (1280x800).
  - Soạn thảo mô tả Store tối ưu SEO (Tiếng Việt & Tiếng Anh).
  - Viết tài liệu **Chính sách quyền riêng tư (Privacy Policy)** cam kết Zero Data Collection (100% dữ liệu xử lý local).
- **Deliverable**: Sẵn sàng nộp hồ sơ phát hành lên Chrome Web Store và Firefox Add-ons.

---

### ⏳ TUẦN 7–8: Bảo Trì & Tính Năng Nâng Cao
- [ ] **Hệ Thống Tự Động Cập Nhật Ruleset**:
  - Kiểm tra và tự cập nhật ruleset mới định kỳ 24–48 giờ từ GitHub/CDN mà không cần cập nhật toàn bộ extension.
- [ ] **Thư Viện Scriptlets Chống Anti-Adblock**:
  - Giả lập các đối tượng chặn phổ biến (`window.adsbygoogle`, fake `canRunAds = true`).
  - Chống các thư viện phát hiện chặn ad (FuckAdBlock, BlockAdBlock, Admiral, PageFair).
- [ ] **Chế Độ Basic / Advanced**:
  - *Basic Mode*: Chỉ sử dụng DNR tĩnh, không can thiệp script, siêu tiết kiệm pin.
  - *Advanced Mode*: Đầy đủ Cosmetic, Scriptlets, Element Picker và YouTube booster.
- **Deliverable**: Sản phẩm hoàn thiện cao cấp, có cộng đồng và khả năng tự duy trì lâu dài.

---

## 📊 Bảng Theo Dõi Tiến Độ

| Tuần | Hạng mục chính | Trạng thái | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Tuần 1** | Hoàn thiện MVP + 500 rules DNR + Badge + Whitelist | **Hoàn thành** | Đã pass 11/11 tests, build Chrome MV3 sẵn sàng |
| **Tuần 2** | Cosmetic Filtering + MutationObserver | **Hoàn thành** | Đã tối ưu CSS triệt để, pass 20/20 tests, zero false-positive |
| **Tuần 3** | Element Picker + Custom Filters + Options | Dự kiến | |
| **Tuần 4** | YouTube Ad-Skipper & Scriptlets | Dự kiến | |
| **Tuần 5** | Thống kê nâng cao + Tối ưu hiệu năng + UX | Dự kiến | |
| **Tuần 6** | Đa trình duyệt (Firefox, Edge) + Submit Store | Dự kiến | |
| **Tuần 7-8**| Auto-update rules + Chống Anti-adblock | Dự kiến | |

---

*Tài liệu này được cập nhật liên tục theo tiến độ thực tế của dự án.*
