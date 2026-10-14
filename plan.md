# 🗺️ Kế Hoạch Triển Khai & Đặc Tả Kỹ Thuật Chống Bug / Code Smell — BlockAds 2.0 (ads-B)

Tài liệu này vừa là lộ trình phát triển theo từng tuần, vừa là **Bản Thiết Kế Kỹ Thuật (Technical Blueprint)** quy định cách viết code chuẩn xác nhằm loại bỏ hoàn toàn các lỗi tiềm ẩn (Runtime Bugs) và mùi mã nguồn xấu (Code Smells) trong môi trường **Chrome Extension Manifest V3**.

---

## 🛑 PHẦN 1: MA TRẬN PHÒNG CHỐNG BUG ĐẶC THÙ CỦA MANIFEST V3

Dưới đây là 6 lỗi nghiêm trọng thường gặp nhất khi viết Adblocker trên Manifest V3 và giải pháp kỹ thuật bắt buộc để triệt tiêu chúng:

| Mã Lỗi | Hiện tượng & Nguyên nhân gốc rễ | Giải pháp triển khai bắt buộc (Zero-Bug Pattern) |
| :--- | :--- | :--- |
| **BUG-01: Sập Service Worker trên Production do onRuleMatchedDebug** | Khi chạy `npm run dev` (Unpacked), sự kiện hoạt động bình thường. Khi đóng gói `.zip` phát hành, `onRuleMatchedDebug` trả về `undefined`, gọi `.addListener` trực tiếp gây lỗi `TypeError` làm sập toàn bộ Background Script. | 1. Kích hoạt `setExtensionActionOptions({ displayActionCountAsBadgeText: true })` làm cơ chế hiển thị Badge gốc trên Production.<br>2. Kết hợp `getMatchedRules({ tabId })` để lấy số liệu khi mở Popup.<br>3. Luôn bọc điều kiện `if (chrome.declarativeNetRequest?.onRuleMatchedDebug)` trước khi gắn listener debug. |
| **BUG-02: Sai lệch thống kê do Race Condition khi tải trang** | Một trang báo chặn 40 quảng cáo cùng lúc. Nếu 40 sự kiện cùng gọi `await storage.get()` -> `+1` -> `await storage.set()`, các luồng đọc cùng giá trị cũ và ghi đè lên nhau khiến bộ đếm chỉ tăng 1–2 đơn vị. | Triển khai **Debounced Batcher + Promise Queue**: Gom toàn bộ số lượt tăng trong chu kỳ `250ms` vào biến bộ nhớ tạm `pendingIncrement`, sau đó mới thực hiện 1 giao dịch đọc-cộng-ghi duy nhất xuống `chrome.storage.local`. |
| **BUG-03: Whitelist không mở khóa được tài nguyên bên thứ 3 (Third-Party)** | Đã bật Whitelist cho `vnexpress.net` nhưng khung video/quảng cáo từ domain đối tác (`admicro.vn`, `doubleclick.net`) nhúng trong trang vẫn bị chặn do Dynamic Rule chỉ dùng `urlFilter` khớp với tên miền chính. | Mỗi domain trong Whitelist phải sinh ra **1 cặp Dynamic Rules (`priority: 100`)**:<br>1. `allowAllRequests` cho `requestDomains: [domain]` ở cấp `main_frame`.<br>2. `allow` cho `initiatorDomains: [domain]` để cho phép mọi request bên thứ 3 xuất phát từ trang đó. |
| **BUG-04: Xung đột ID khi cập nhật Dynamic Rules (Duplicate ID)** | Gọi `updateDynamicRules` bị văng ngoại lệ `Rule with id 10000 does not have a unique ID` khiến toàn bộ danh sách Whitelist ngừng hoạt động. | Trước khi thêm rule mới, luôn gọi `getDynamicRules()`, lọc toàn bộ ID nằm trong phân vùng Whitelist (`10000 <= id <= 19999`) đưa vào `removeRuleIds` cùng lúc với `addRules` trong **1 lệnh gọi nguyên tử duy nhất**. |
| **BUG-05: Mất trạng thái khi Service Worker tự hủy sau 30s** | MV3 Service Worker tự động ngủ sau 30 giây không có sự kiện. Mọi biến toàn cục (`Map`, `Set`, `let count`) sẽ bị xóa sạch khi thức dậy. | Tuyệt đối không dùng biến toàn cục làm nguồn dữ liệu gốc (Source of Truth). Lưu danh sách Whitelist & Thống kê ngày vào `chrome.storage.local`, lưu bộ đếm tạm theo Tab vào `chrome.storage.session`. |
| **BUG-06: Nhấp nháy giao diện (FOUC) & giật lag CPU khi cuộn trang** | Tiêm CSS ở `document_idle` làm khung quảng cáo hiện ra 1 giây rồi mới mất. Dùng `MutationObserver` quét DOM liên tục trên trang cuộn vô tận (Facebook, YouTube) gây treo tab. | Cấu hình Content Script ở `runAt: 'document_start'`. Sử dụng **Pure Declarative CSS Injection** (chèn 1 thẻ `<style>` duy nhất vào `document.documentElement`) để trình duyệt tự ẩn phần tử bằng C++ Layout Engine (`0% CPU`). |

---

## 🧹 PHẦN 2: QUY CHUẨN LOẠI BỎ CODE SMELL & MẪU TRIỂN KHAI CHUẨN

### 1. Bảng Đối Chiếu Chống Code Smell (Clean Code Rules)

* ❌ **Smell 1 — Magic Numbers & Hardcoded Strings:** Viết trực tiếp các con số `100`, `999`, `'999+'`, `10000`, `'#e74c3c'` rải rác ở nhiều file.
  * ✔️ **Cách khắc phục:** Tập trung toàn bộ vào `src/constants.ts` với kiểu `as const`.
* ❌ **Smell 2 — Bóc tách URL/Domain bằng .split() hoặc Regex thủ công:** Dễ gây lỗi khi gặp URL chứa cổng (`localhost:3000`), chuỗi truy vấn phức tạp, hoặc trang hệ thống (`chrome://extensions`, `about:blank`).
  * ✔️ **Cách khắc phục:** Sử dụng hàm thuần túy `extractNormalizedDomain()` trong `src/domain.ts` dựa trên chuẩn `new URL()` và kiểm tra giao thức hợp lệ (`http:` / `https:`).
* ❌ **Smell 3 — God Entrypoint Files (Nhồi nhét logic vào UI/Background):** Viết hàng trăm dòng xử lý dữ liệu trực tiếp trong `entrypoints/popup/main.ts` hoặc `entrypoints/background.ts`.
  * ✔️ **Cách khắc phục:** Các file trong `entrypoints/` chỉ làm nhiệm vụ điều phối sự kiện (Controller/Wiring) dưới 100 dòng. Toàn bộ nghiệp vụ nằm trong `src/` để kiểm thử độc lập bằng Vitest.
* ❌ **Smell 4 — Silent Catch Blocks (Nuốt lỗi im lặng):** Dùng `try { ... } catch {}` trống rỗng không rõ lý do.
  * ✔️ **Cách khắc phục:** Viết hàm bọc xử lý lỗi rõ ràng hoặc ghi chú cụ thể nguyên nhân bỏ qua (ví dụ: tab đã bị người dùng đóng trước khi kịp cập nhật Badge).

---

### 2. Thiết Kế Module Chuẩn Hóa Trong `src/`

#### 📌 Module 1: Quản lý Hằng số tập trung (`src/constants.ts`)
    export const BADGE_CONFIG = {
      ALERT_COLOR: '#e74c3c',
      DISABLED_COLOR: '#7f8c8d',
      MAX_DISPLAY_COUNT: 999,
      OVERFLOW_TEXT: '999+',
      DISABLED_TEXT: 'OFF',
    } as const;

    export const DNR_CONFIG = {
      WHITELIST_PRIORITY: 100,
      WHITELIST_RULE_ID_START: 10000,
      WHITELIST_RULE_ID_END: 19999,
      STATIC_RULESETS: ['easylist', 'easyprivacy', 'abpvn'] as const,
    } as const;

    export const STORAGE_KEYS = {
      WHITELIST: 'whitelist',
      STATS: 'stats',
      ENABLED_RULESETS: 'enabledRulesets',
    } as const;

#### 📌 Module 2: Chuẩn hóa Domain an toàn (`src/domain.ts`)
    const VALID_WEB_PROTOCOLS = new Set(['http:', 'https:']);

    export function extractNormalizedDomain(input: string | undefined | null): string | null {
      if (!input || typeof input !== 'string') return null;
      const trimmed = input.trim().toLowerCase();
      if (!trimmed) return null;

      try {
        const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
        const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

        if (!VALID_WEB_PROTOCOLS.has(parsed.protocol)) {
          return null; // Bỏ qua chrome://, edge://, about:, file://
        }

        const cleanHost = parsed.hostname.replace(/^www\./, '');
        return cleanHost.includes('.') || cleanHost === 'localhost' ? cleanHost : null;
      } catch {
        return null;
      }
    }

    export function isDomainWhitelisted(hostname: string, whitelist: readonly string[]): boolean {
      const target = extractNormalizedDomain(hostname);
      if (!target) return false;

      return whitelist.some((item) => {
        const allowed = extractNormalizedDomain(item);
        if (!allowed) return false;
        return target === allowed || target.endsWith(`.${allowed}`);
      });
    }

#### 📌 Module 3: Chống Race Condition khi ghi Storage (`src/storage.ts`)
    import { BADGE_CONFIG } from './constants';

    export interface BlockStats {
      todayCount: number;
      totalCount: number;
      lastResetDate: string;
    }

    let pendingIncrement = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let mutexChain: Promise<void> = Promise.resolve();

    export function getTodayIsoString(): string {
      return new Date().toISOString().slice(0, 10);
    }

    export function formatBadgeText(count: number): string {
      if (count <= 0) return '';
      return count > BADGE_CONFIG.MAX_DISPLAY_COUNT
        ? BADGE_CONFIG.OVERFLOW_TEXT
        : String(count);
    }

    // Gom nhóm các sự kiện chặn trong 250ms và ghi tuần tự qua Mutex Chain
    export function queueStatIncrement(delta = 1): void {
      if (delta <= 0) return;
      pendingIncrement += delta;

      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          const amountToCommit = pendingIncrement;
          pendingIncrement = 0;
          flushTimer = null;
          mutexChain = mutexChain.then(() => commitIncrementToStorage(amountToCommit));
        }, 250);
      }
    }

    async function commitIncrementToStorage(amount: number): Promise<void> {
      const today = getTodayIsoString();
      const data = await chrome.storage.local.get({
        stats: { todayCount: 0, totalCount: 0, lastResetDate: today },
      });

      const current: BlockStats = data.stats;
      const isNewDay = current.lastResetDate !== today;

      const updated: BlockStats = {
        todayCount: (isNewDay ? 0 : current.todayCount) + amount,
        totalCount: current.totalCount + amount,
        lastResetDate: today,
      };

      await chrome.storage.local.set({ stats: updated });
    }

#### 📌 Module 4: Đồng bộ nguyên tử Whitelist Dynamic Rules (`src/whitelist.ts`)
    import { DNR_CONFIG } from './constants';
    import { extractNormalizedDomain } from './domain';

    export function buildWhitelistRules(domains: readonly string[]): chrome.declarativeNetRequest.Rule[] {
      const uniqueDomains = Array.from(
        new Set(domains.map(extractNormalizedDomain).filter((d): d is string => Boolean(d)))
      );

      const rules: chrome.declarativeNetRequest.Rule[] = [];

      uniqueDomains.forEach((domain, idx) => {
        const baseRuleId = DNR_CONFIG.WHITELIST_RULE_ID_START + idx * 2;

        // Rule 1: Mở khóa toàn bộ tài nguyên thuộc trang chính
        rules.push({
          id: baseRuleId,
          priority: DNR_CONFIG.WHITELIST_PRIORITY,
          action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
          condition: {
            requestDomains: [domain],
            resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
          },
        });

        // Rule 2: Mở khóa toàn bộ request bên thứ 3 xuất phát từ domain này
        rules.push({
          id: baseRuleId + 1,
          priority: DNR_CONFIG.WHITELIST_PRIORITY,
          action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
          condition: {
            initiatorDomains: [domain],
          },
        });
      });

      return rules;
    }

    export async function syncWhitelistDynamicRules(whitelist: readonly string[]): Promise<void> {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

      // Chỉ xóa các ID nằm trong dải dành riêng cho Whitelist (10000 - 19999)
      const removeRuleIds = existingRules
        .filter(
          (r) =>
            r.id >= DNR_CONFIG.WHITELIST_RULE_ID_START &&
            r.id <= DNR_CONFIG.WHITELIST_RULE_ID_END
        )
        .map((r) => r.id);

      const addRules = buildWhitelistRules(whitelist);

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
      });
    }

---

## 📅 PHẦN 3: LỘ TRÌNH PHÁT TRIỂN CHI TIẾT 4 GIAI ĐOẠN

### ✅ Giai Đoạn 1 (Tuần 1): Xây Dựng Nền Tảng & Adblock MVP — [HOÀN THÀNH]
- [x] Khởi tạo kiến trúc dự án với **WXT Framework**, **TypeScript** và **Vitest**.
- [x] Xây dựng 3 bộ lọc tĩnh chuẩn MV3 với tổng cộng **500 rules**:
  - [x] `ruleset-easylist.json` (220 rules chặn mạng quảng cáo quốc tế).
  - [x] `ruleset-easyprivacy.json` (160 rules chặn trackers & analytics).
  - [x] `ruleset-abpvn.json` (120 rules tối ưu cho báo điện tử và website Việt Nam).
- [x] Viết công cụ tự động hóa `npm run build:rules` và `npm run validate:rules`.
- [x] Xây dựng cơ chế Whitelist lưu trữ bền vững trong `chrome.storage.local` và đồng bộ sang Dynamic Rules (`priority: 100`, `action: allow`).
- [x] Thiết kế giao diện **Popup Dark Mode** hiện đại, tích hợp tab **"Test 20 trang"** và hiển thị Badge `#e74c3c` (`999+`).

### ✅ Giai Đoạn 2 (Tuần 2): Lọc Thẩm Mỹ (Cosmetic Filtering) & Kiểm Thử — [HOÀN THÀNH]
- [x] Triển khai hệ thống tiêm CSS ẩn khung quảng cáo rỗng qua Content Scripts ở thời điểm `document_start`.
- [x] Phân tách rõ ràng 2 nhóm CSS Selectors: Generic Selectors và Site-Specific Selectors cho các trang báo Việt Nam (VnExpress, Dân Trí, Kênh 14, 24h, Tuổi Trẻ, ...).
- [x] Tự động tắt bộ lọc thẩm mỹ trên các trang được đưa vào danh sách Whitelist.
- [x] Viết bộ **Unit Tests** toàn diện trong `tests/unit/` kiểm tra logic chuẩn hóa domain, sinh rule động, định dạng badge và quản lý storage.

### ✅ Giai Đoạn 3 (Tuần 3): Tái Cấu Trúc Clean Code & Chuẩn Hóa Production — [HOÀN THÀNH XUẤT SẮC]
- [x] **Chuẩn hóa kiến trúc chống Code Smell:**
  - [x] Tách `src/constants.ts` và `src/domain.ts`, xóa bỏ hoàn toàn Magic Numbers và các đoạn cắt chuỗi URL thủ công.
  - [x] Nâng cấp `src/storage.ts` với cơ chế `queueStatIncrement` chống Race Condition (**BUG-02**).
- [x] **Chuẩn hóa bộ đếm Badge cho môi trường Production (**BUG-01**):**
  - [x] Bật `setExtensionActionOptions({ displayActionCountAsBadgeText: true })`.
  - [x] Tích hợp `getMatchedRules` đồng bộ số liệu khi mở Popup, giữ `onRuleMatchedDebug` có kiểm tra điều kiện an toàn.
- [x] **Nâng cấp Whitelist 2 lớp (**BUG-03** & **BUG-04**):**
  - [x] Áp dụng cặp quy tắc `allowAllRequests` (`main_frame`) + `allow` (`initiatorDomains`) và đồng bộ nguyên tử theo dải ID `10000–19999`.
- [x] **Quản lý Bật/Tắt từng bộ lọc trên Popup:** Cho phép người dùng bật/tắt độc lập từng bộ lọc (`EasyList`, `EasyPrivacy`, `ABPVN`) qua `updateEnabledRulesets`.
- [x] **Tính năng chọn phần tử thủ công (Element Picker):** Cho phép người dùng click trực tiếp vào vùng quảng cáo trên trang để tạo quy tắc ẩn CSS cá nhân.


### 🚀 Giai Đoạn 4 (Tuần 4): Mở Rộng 30.000+ Rules, CI/CD & Phát Hành — [DỰ KIẾN]
- [ ] **Mở rộng quy mô Ruleset (30.000+ Static Rules):** Nâng cấp `scripts/build-rules.mjs` tự động tải và biên dịch trực tiếp từ danh sách gốc của EasyList, EasyPrivacy và ABPVN.
- [ ] **Xây dựng trang Options Page nâng cao:** Hỗ trợ Import/Export danh sách Whitelist & quy tắc ẩn CSS cá nhân ra file `.json`, kèm biểu đồ thống kê theo tuần.
- [ ] **Thiết lập GitHub Actions CI/CD (`.github/workflows/ci.yml`):** Tự động chạy kiểm tra TypeScript, xác thực JSON ruleset và chạy Vitest trên mọi Commit / Pull Request.
- [ ] **Đóng gói và Phát hành (Release `v1.0.0`):** Xuất bản gói `.zip` chuẩn hóa lên mục **GitHub Releases** và Chrome Web Store.

---

## ✔️ PHẦN 4: CỔNG KIỂM SOÁT CHẤT LƯỢNG TRƯỚC KHI COMMIT (PRE-COMMIT QUALITY GATE)

Trước khi thực hiện bất kỳ lệnh `git commit` nào, toàn bộ 4 câu lệnh kiểm định dưới đây bắt buộc phải vượt qua với trạng thái **PASS (0 lỗi)**:

    npm run compile
    npm run validate:rules
    npm test
    npm run build