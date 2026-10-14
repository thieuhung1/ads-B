# 🛡️ BlockAds 2.0 — MVP (Tuần 1)

Extension chặn quảng cáo & trackers bảo vệ quyền riêng tư siêu nhẹ, chuẩn **Manifest V3** sử dụng công nghệ **Declarative Net Request (DNR)** của Google Chrome.

---

## 🚀 Tính Năng Hoàn Thành (Tuần 1)

1. **500 Ruleset Chuẩn MV3 (3 Rulesets độc lập)**:
   - `ruleset-easylist.json`: **220 rules** chặn mạng lưới quảng cáo lớn (Google Ads, DoubleClick, Criteo, Taboola, Outbrain, PopAds, ...).
   - `ruleset-easyprivacy.json`: **160 rules** chặn trackers & analytics theo dõi người dùng (Google Analytics, Facebook Pixel, Hotjar, Clarity, TikTok Pixel, ...).
   - `ruleset-abpvn.json`: **120 rules** tối ưu đặc thù cho các trang web Việt Nam (eClick, AmbientPlatform, Admicro, Ants, VietAd, Zing Ads, 24h Ads, Kenh14 Ads, ...).
2. **Badge Số Lượng Request Bị Chặn**:
   - Tự động hiển thị và cập nhật số request bị chặn theo thời gian thực trên icon extension (đổi màu đỏ cảnh báo `#e74c3c`, text `999+` khi vượt quá 999).
   - Tích hợp theo dõi qua `chrome.declarativeNetRequest.getMatchedRules` và `onRuleMatchedDebug`.
3. **Whitelist Bền Vững & Đồng Bộ Dynamic Rules**:
   - Lưu trữ danh sách whitelist vào `chrome.storage.local`.
   - Tự động đồng bộ sang Declarative Net Request Dynamic Rules (`priority: 100`, `action: allow`) để các trang được whitelist không bao giờ bị chặn.
   - Quản lý whitelist dễ dàng trong Popup: Thêm domain, xóa từng domain, hoặc xóa toàn bộ danh sách.
4. **Popup Giao Diện Dark Mode Hiện Đại**:
   - Hiển thị domain hiện tại & công tắc Bật/Tắt bảo vệ tức thì (Toggle switch).
   - Thống kê chi tiết: Số request bị chặn trên tab hiện tại, số lượng chặn hôm nay và tổng cộng từ trước tới nay.
   - Tab "Test 20 trang" tích hợp sẵn 20 website phổ biến (VnExpress, YouTube, Facebook, Dân Trí, 24h, Kênh 14, ...) để click mở test trực tiếp!

---

## 🛠️ Hướng Dẫn Cài Đặt Vào Trình Duyệt

1. Mở Chrome, Brave, Cốc Cốc hoặc Edge.
2. Truy cập vào: `chrome://extensions/` (hoặc `edge://extensions/`).
3. Bật công tắc **Chế độ dành cho nhà phát triển** (**Developer mode**) ở góc trên bên phải.
4. Nhấp nút **Tải tiện ích đã giải nén** (**Load unpacked**).
5. Chọn thư mục:
   ```
   D:\dev\blockads2.0\.output\chrome-mv3
   ```
6. Ghim extension **BlockAds 2.0** lên thanh công cụ để trải nghiệm!

---

## 💻 Lệnh Phát Triển & Kiểm Thử

```bash
# Chạy chế độ Development (Hot Reloading)
npm run dev

# Chạy toàn bộ Unit Tests (Vitest)
npm test

# Kiểm tra TypeScript
npm run compile

# Cập nhật và build lại các ruleset
npm run build:rules

# Kiểm tra tính hợp lệ của ruleset JSON
npm run validate:rules

# Build production bundle
npm run build
```
