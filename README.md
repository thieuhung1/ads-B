# 🛡️ BlockAds 2.0 (ads-B)

Extension chặn quảng cáo & trình theo dõi (trackers) bảo vệ quyền riêng tư siêu nhẹ, được xây dựng theo chuẩn **Manifest V3** sử dụng công nghệ **Declarative Net Request (DNR)** kết hợp **Cosmetic Filtering** trên nền tảng **WXT Framework** và **TypeScript**.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![Framework](https://img.shields.io/badge/Framework-WXT-00dc82?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-70.2%25-3178c6?style=flat-square)
![Tested with Vitest](https://img.shields.io/badge/Tested_with-Vitest-729b1b?style=flat-square)

---

## 🚀 Tính Năng Cốt Lõi (Tuần 1 & Tuần 2)

### 1. Chặn Quảng Cáo & Trackers Tầng Mạng (Declarative Net Request)
Sử dụng **500+ Ruleset chuẩn MV3** chia thành 3 bộ lọc độc lập, xử lý trực tiếp bởi nhân trình duyệt với độ trễ bằng không (`0ms` overhead):
* **ruleset-easylist.json (220 rules):** Chặn các mạng lưới phân phối quảng cáo quốc tế lớn (Google Ads, DoubleClick, Criteo, Taboola, Outbrain, PopAds, ...).
* **ruleset-easyprivacy.json (160 rules):** Chặn hệ thống trackers & analytics thu thập hành vi người dùng (Google Analytics, Facebook Pixel, Hotjar, Clarity, TikTok Pixel, ...).
* **ruleset-abpvn.json (120 rules):** Tối ưu hóa đặc thù cho hệ sinh thái báo điện tử và website Việt Nam (eClick, AmbientPlatform, Admicro, Ants, VietAd, Zing Ads, 24h Ads, Kenh14 Ads, ...).

### 2. Lọc Thẩm Mỹ — Làm Sạch Bố Cục Trang (Cosmetic Filtering)
* **Chống nhấp nháy khung quảng cáo (Zero FOUC):** Tự động tiêm CSS ẩn các khung chứa quảng cáo rỗng (placeholder, banner trống, iframe thừa) ngay từ thời điểm `document_start`.
* **Phân tầng bộ chọn (Dual-Layer Selectors):** Kết hợp bộ chọn phổ quát (Generic Selectors) và bộ chọn riêng biệt cho từng trang báo Việt Nam (Site-Specific Selectors).
* **Tự động nhường quyền cho Whitelist:** Không áp dụng CSS ẩn phần tử nếu tên miền hiện tại nằm trong danh sách được người dùng tin cậy.

### 3. Whitelist Bền Vững & Đồng Bộ Nguyên Tử (Atomic Dynamic Rules Sync)
* Lưu trữ danh sách tên miền tin cậy trong `chrome.storage.local`.
* Tự động đồng bộ sang **DNR Dynamic Rules** (`priority: 100`) với cơ chế mở khóa kép:
  1. `allowAllRequests` ở cấp độ `main_frame` (`requestDomains`) để cho phép toàn bộ tài nguyên bên trong trang.
  2. `allow` với `initiatorDomains` để đảm bảo các tài nguyên bên thứ ba (third-party) khởi tạo từ trang đó không bị Static Rules chặn nhầm.
* Quản lý trực tiếp trên Popup: Bật/tắt nhanh bằng công tắc (Toggle switch), thêm domain, xóa từng domain hoặc xóa toàn bộ danh sách.

### 4. Thống Kê Thời Gian Thực & Giao Diện Popup Dark Mode
* **Badge Thông Minh:** Hiển thị số lượng request bị chặn theo thời gian thực ngay trên biểu tượng thanh công cụ (màu đỏ cảnh báo `#e74c3c`, tự động rút gọn thành `999+` khi vượt quá 999).
* **Cơ chế đếm kép tương thích Production:** Kết hợp `setExtensionActionOptions`, `getMatchedRules` (hoạt động trên bản phát hành Chrome Web Store) và `onRuleMatchedDebug` (hỗ trợ debug thời gian thực ở chế độ Developer Mode).
* **Popup Dark Mode Hiện Đại:**
  * Hiển thị tên miền hiện tại cùng trạng thái bảo vệ trực quan.
  * Thống kê chi tiết 3 thông số: **Tab hiện tại** / **Hôm nay** / **Tổng cộng**.
  * **Tab "Test 20 trang":** Tích hợp sẵn danh sách 20 website phổ biến (VnExpress, YouTube, Facebook, Dân Trí, 24h, Kênh 14, ...) để mở kiểm thử nhanh chỉ với 1 cú nhấp chuột.

---

## 🏗️ Kiến Trúc Mã Nguồn & Phân Tách Trách Nhiệm (Clean Architecture)

Dự án áp dụng nguyên lý **Separation of Concerns (SoC)**: tách biệt hoàn toàn tầng giao tiếp trình duyệt (`entrypoints/`) khỏi tầng logic nghiệp vụ thuần túy (`src/`) để ngăn chặn Code Smell và đạt độ phủ Unit Test tối đa.

* **entrypoints/** — Tầng Runtime Entrypoints (Chỉ điều phối sự kiện, không chứa logic phức tạp):
  * `background.ts`: Quản lý vòng đời Service Worker, đồng bộ DNR & cập nhật Badge.
  * `content.ts`: Tiêm CSS Cosmetic Filtering ở giai đoạn `document_start`.
  * `popup/`: Giao diện người dùng Dark Mode (HTML/CSS/TS).
* **public/** — Tài nguyên tĩnh & Bộ lọc DNR đã biên dịch:
  * `icon/`: Bộ icon extension các kích thước chuẩn (16, 32, 48, 128).
  * `ruleset-easylist.json`: Bộ lọc quảng cáo quốc tế (220 rules).
  * `ruleset-easyprivacy.json`: Bộ lọc chống theo dõi (160 rules).
  * `ruleset-abpvn.json`: Bộ lọc quảng cáo Việt Nam (120 rules).
* **scripts/** — Công cụ tự động hóa Build & Kiểm định chất lượng Ruleset:
  * `build-rules.mjs`: Biên dịch và chuẩn hóa các bộ lọc sang JSON chuẩn MV3.
  * `validate-rules.mjs`: Xác thực cấu trúc JSON, kiểm tra trùng ID và cú pháp URLFilter.
* **src/** — Tầng Logic Nghiệp Vụ Lõi (Pure TypeScript, dễ dàng Unit Test):
  * `constants.ts`: Định nghĩa tập trung toàn bộ hằng số (Không dùng Magic Numbers).
  * `domain.ts`: Chuẩn hóa và kiểm tra tính hợp lệ của URL / Hostname.
  * `storage.ts`: Quản lý Storage an toàn kèm cơ chế Debounce chống Race Condition.
  * `whitelist.ts`: Thuật toán sinh và đồng bộ nguyên tử DNR Dynamic Rules.
  * `cosmetic.ts`: Quản lý CSS Selectors và kết xuất Stylesheet theo tên miền.
* **tests/unit/** — Hệ thống Unit Tests tự động hóa với Vitest.

---

## 🛡️ Nguyên Tắc Kỹ Thuật Phòng Tránh Bug & Code Smell

1. **Tương thích 100% giữa Dev và Production:** Luôn kiểm tra sự tồn tại của `chrome.declarativeNetRequest?.onRuleMatchedDebug` trước khi đăng ký listener, kết hợp `getMatchedRules` để không bao giờ gây lỗi crash Service Worker khi đóng gói phát hành.
2. **Bền vững trước vòng đời ngủ của Service Worker:** Không lưu trữ trạng thái quan trọng trên biến toàn cục (in-memory). Toàn bộ trạng thái được đồng bộ xuống `chrome.storage.local` và `chrome.storage.session`.
3. **Chống xung đột ghi dữ liệu (Zero Race Conditions):** Mọi lượt tăng thống kê quảng cáo bị chặn đều đi qua bộ đệm gom nhóm (`StatsBatcher`) và ghi xuống Storage theo chu kỳ `250ms`, ngăn chặn tình trạng mất số liệu khi hàng chục request bị chặn cùng một mili-giây.
4. **Không có Magic Numbers / Hardcoded Strings:** Mọi ngưỡng giới hạn (`999`), độ ưu tiên (`100`), dải ID (`10000`), mã màu (`#e74c3c`) đều được quản lý tập trung tại `src/constants.ts`.

---

## 🛠️ Hướng Dẫn Cài Đặt Vào Trình Duyệt

### Bước 1: Chuẩn bị và Build mã nguồn
Yêu cầu hệ thống đã cài đặt Node.js (phiên bản >= 18.x). Chạy lần lượt các lệnh sau trong Terminal:

    git clone [https://github.com/thieuhung1/ads-B.git](https://github.com/thieuhung1/ads-B.git)
    cd ads-B
    npm install
    npm run validate:rules
    npm run build

### Bước 2: Nạp Extension vào trình duyệt
1. Mở trình duyệt **Google Chrome**, **Brave**, **Cốc Cốc** hoặc **Microsoft Edge**.
2. Truy cập vào đường dẫn quản lý tiện ích: `chrome://extensions/` (hoặc `edge://extensions/`).
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
4. Nhấp vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
5. Chọn thư mục **`.output/chrome-mv3`** nằm bên trong thư mục dự án `ads-B` vừa build.
6. Ghim **BlockAds 2.0** lên thanh công cụ để bắt đầu trải nghiệm!

---

## 💻 Các Lệnh Phát Triển & Kiểm Thử

* Chạy chế độ Development (Tự động mở trình duyệt & Hot Reloading):
  `npm run dev`
* Chạy toàn bộ Unit Tests (Vitest):
  `npm test`
* Kiểm tra lỗi cú pháp và kiểu dữ liệu TypeScript:
  `npm run compile`
* Cập nhật và biên dịch lại 3 bộ lọc ruleset JSON:
  `npm run build:rules`
* Kiểm tra tính hợp lệ của cấu trúc JSON ruleset theo chuẩn Chrome MV3:
  `npm run validate:rules`
* Build bản Production tối ưu hóa dung lượng:
  `npm run build`