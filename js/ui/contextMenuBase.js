/**
 * Base functionality for context menus
 * Shared between main context menu and waypoint context menu
 */

/**
 * Base class for context menu functionality
 */
export class ContextMenuBase {
  constructor(menuId) {
    this.menuId = menuId;
    this.menu = null;
    this.closeHandlers = [];
  }

  /**
   * Get the menu element
   * @returns {HTMLElement|null}
   */
  getMenu() {
    if (!this.menu) {
      this.menu = document.getElementById(this.menuId);
    }
    return this.menu;
  }

  /**
   * Show context menu at specified position
   * @param {Object} position - Position object with left, top, or element
   * @param {Object} options - Options for positioning
   * @param {HTMLElement} options.anchorElement - Element to position relative to
   * @param {number} options.offsetX - X offset from anchor
   * @param {number} options.offsetY - Y offset from anchor
   * @param {string} options.position - 'above', 'below', 'left', 'right', or 'auto'
   */
  show(position, options = {}) {
    const menu = this.getMenu();
    if (!menu) return;

    // Hide other context menus
    this.hideOtherMenus();

    let left, top;

    if (position.element) {
      // Position relative to element
      const rect = position.element.getBoundingClientRect();
      left = rect.left + (rect.width / 2);
      top = rect.top;
    } else {
      // Use provided coordinates
      left = position.left || 0;
      top = position.top || 0;
    }

    // Show menu to get dimensions
    menu.classList.remove('hidden');
    const menuWidth = menu.offsetWidth || 200;
    const menuHeight = menu.offsetHeight || 200;

    // Apply options
    if (options.anchorElement) {
      const anchorRect = options.anchorElement.getBoundingClientRect();
      left = anchorRect.left + (options.offsetX || 0);
      top = anchorRect.top + (options.offsetY || 0);
    }

    // Adjust position based on position option
    if (options.position === 'above' || (options.position === 'auto' && top < menuHeight)) {
      top = top - menuHeight - (options.spacing || 8);
    } else if (options.position === 'below') {
      top = top + (options.spacing || 8);
    }

    // Center horizontally if positioning relative to element
    if (position.element) {
      left = left - menuWidth / 2;
    }

    // Ensure menu stays within viewport
    if (left < 0) left = 8;
    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
    if (top < 0) top = 8;
    if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.position = 'fixed';

    // Setup close handlers
    this.setupCloseHandlers(options.excludeElements || []);
  }

  /**
   * Hide context menu
   */
  hide() {
    const menu = this.getMenu();
    if (menu) {
      menu.classList.add('hidden');
    }
    this.removeCloseHandlers();
  }

  /**
   * Hide other context menus
   */
  hideOtherMenus() {
    const otherMenus = ['context-menu', 'waypoint-context-menu'];
    otherMenus.forEach(id => {
      if (id !== this.menuId) {
        const otherMenu = document.getElementById(id);
        if (otherMenu) {
          otherMenu.classList.add('hidden');
        }
      }
    });
  }

  /**
   * Setup close handlers for clicking outside menu
   * @param {Array<HTMLElement>} excludeElements - Elements to exclude from close check
   */
  setupCloseHandlers(excludeElements = []) {
    const menu = this.getMenu();
    if (!menu) return;

    const closeOnOutsideClick = (e) => {
      // Check if click is outside menu and not on excluded elements
      const isOutsideMenu = menu && !menu.contains(e.target);
      const isOnExcluded = excludeElements.some(el => el && el.contains(e.target));
      
      if (isOutsideMenu && !isOnExcluded) {
        this.hide();
        this.removeCloseHandlers();
      }
    };

    // Use setTimeout to avoid immediate close
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick, true);
      document.addEventListener('contextmenu', closeOnOutsideClick, true);
      this.closeHandlers.push(closeOnOutsideClick);
    }, 100);
  }

  /**
   * Remove close handlers
   */
  removeCloseHandlers() {
    this.closeHandlers.forEach(handler => {
      document.removeEventListener('click', handler, true);
      document.removeEventListener('contextmenu', handler, true);
    });
    this.closeHandlers = [];
  }
}

