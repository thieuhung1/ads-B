import { CosmeticEngine } from './cosmetic-engine';

export class ElementPicker {
  private static instance: ElementPicker;
  private isActive: boolean = false;
  private currentElement: HTMLElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private banner: HTMLDivElement | null = null;
  private tagBadge: HTMLDivElement | null = null;

  private constructor() {}

  public static getInstance(): ElementPicker {
    if (!ElementPicker.instance) {
      ElementPicker.instance = new ElementPicker();
    }
    return ElementPicker.instance;
  }

  public activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.createOverlayElements();
    this.attachEventListeners();
  }

  public deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    this.removeEventListeners();
    this.removeOverlayElements();
  }

  private createOverlayElements(): void {
    // 1. Banner hướng dẫn ở đầu trang
    this.banner = document.createElement('div');
    this.banner.id = 'blockads-picker-banner';
    this.banner.style.cssText = `
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: #0f172a !important;
      color: #f8fafc !important;
      border: 1px solid #06b6d4 !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(6,182,212,0.3) !important;
      padding: 10px 20px !important;
      border-radius: 30px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      pointer-events: auto !important;
      user-select: none !important;
    `;

    this.banner.innerHTML = `
      <span>🎯 <strong>Chế độ chọn:</strong> Di chuột & Click để ẩn phần tử</span>
      <button id="blockads-picker-cancel-btn" style="
        background: rgba(244,63,94,0.2) !important;
        border: 1px solid #f43f5e !important;
        color: #f43f5e !important;
        border-radius: 14px !important;
        padding: 4px 10px !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
      ">Hủy (ESC)</button>
    `;

    document.documentElement.appendChild(this.banner);

    const cancelBtn = this.banner.querySelector('#blockads-picker-cancel-btn');
    cancelBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deactivate();
    });

    // 2. Khung highlight di chuyển theo chuột
    this.overlay = document.createElement('div');
    this.overlay.id = 'blockads-picker-overlay';
    this.overlay.style.cssText = `
      position: fixed !important;
      pointer-events: none !important;
      border: 2px solid #06b6d4 !important;
      background: rgba(6, 182, 212, 0.15) !important;
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.4) !important;
      z-index: 2147483646 !important;
      display: none !important;
      border-radius: 4px !important;
      transition: all 0.08s ease !important;
    `;

    // 3. Tag badge hiển thị selector của phần tử
    this.tagBadge = document.createElement('div');
    this.tagBadge.style.cssText = `
      position: absolute !important;
      top: -24px !important;
      left: 0 !important;
      background: #06b6d4 !important;
      color: #0b0f19 !important;
      font-family: monospace !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      white-space: nowrap !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
    `;
    this.overlay.appendChild(this.tagBadge);

    document.documentElement.appendChild(this.overlay);
  }

  private removeOverlayElements(): void {
    if (this.banner) {
      this.banner.remove();
      this.banner = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.tagBadge = null;
    }
  }

  private attachEventListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private removeEventListeners(): void {
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isActive || !this.overlay) return;

    const target = e.target as HTMLElement;
    if (!target || target === this.banner || target === this.overlay || this.banner?.contains(target)) {
      return;
    }

    this.currentElement = target;
    const rect = target.getBoundingClientRect();

    this.overlay.style.display = 'block';
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    const selector = this.generateSelector(target);
    if (this.tagBadge) {
      this.tagBadge.textContent = selector.length > 30 ? selector.slice(0, 27) + '...' : selector;
    }
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    if (this.banner?.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (this.currentElement) {
      const selector = this.generateSelector(this.currentElement);
      CosmeticEngine.getInstance().addTempSelector(selector);
      this.showToast(`✅ Đã ẩn tạm thời: ${selector}`);
    }

    this.deactivate();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.deactivate();
      this.showToast('Đã hủy chế độ chọn phần tử');
    }
  };

  /**
   * Sinh CSS Selector thông minh và bền vững cho một element
   */
  public generateSelector(el: HTMLElement): string {
    // 1. Kiểm tra ID nếu có và không phải ID ngẫu nhiên động
    if (el.id && !el.id.match(/\d{5,}|[a-f0-9]{12,}/i)) {
      const idSelector = `#${CSS.escape(el.id)}`;
      if (document.querySelectorAll(idSelector).length === 1) {
        return idSelector;
      }
    }

    // 2. Kiểm tra các class đặc trưng (bỏ qua utility classes phổ biến)
    if (el.classList && el.classList.length > 0) {
      const validClasses = Array.from(el.classList).filter(c =>
        !c.match(/^(active|open|show|hide|fade|selected|focus|hover|js-|_)/i) &&
        !c.match(/\d{5,}/)
      );

      if (validClasses.length > 0) {
        const classSelector = `.${validClasses.map(c => CSS.escape(c)).join('.')}`;
        const matches = document.querySelectorAll(classSelector);
        if (matches.length <= 3) {
          return `${el.tagName.toLowerCase()}${classSelector}`;
        }
      }
    }

    // 3. Kiểm tra thuộc tính data-*
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('data-') && attr.value && !attr.value.match(/\d{6,}/)) {
        const attrSelector = `[${attr.name}="${CSS.escape(attr.value)}"]`;
        if (document.querySelectorAll(attrSelector).length <= 3) {
          return `${el.tagName.toLowerCase()}${attrSelector}`;
        }
      }
    }

    // 4. Fallback theo path cha - con với nth-of-type
    const parent = el.parentElement;
    const tagName = el.tagName.toLowerCase();
    if (parent && parent !== document.body) {
      const siblings = Array.from(parent.children).filter(child => child.tagName === el.tagName);
      const index = siblings.indexOf(el) + 1;
      const firstValidClass = parent.classList && parent.classList.length > 0
        ? Array.from(parent.classList).find(c => typeof c === 'string' && !c.match(/\d{5,}/))
        : null;

      const parentSelector = parent.id
        ? `#${CSS.escape(parent.id)}`
        : firstValidClass
        ? `.${CSS.escape(firstValidClass)}`
        : parent.tagName.toLowerCase();

      return `${parentSelector} > ${tagName}:nth-of-type(${index})`;
    }

    return tagName;
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      background: #0f172a !important;
      color: #38bdf8 !important;
      border: 1px solid rgba(56,189,248,0.4) !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
      padding: 10px 18px !important;
      border-radius: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      z-index: 2147483647 !important;
      animation: fadeIn 0.2s ease !important;
    `;
    toast.textContent = message;
    document.documentElement.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

export default ElementPicker;
