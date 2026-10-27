/**
 * Standalone Toast Notification Utility
 * SCRUM-117: Interactive Review Helpful Votes and Feedback UX
 * Exported globally on window.Toast
 */
(function() {
  'use strict';

  function getOrCreateContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const Toast = {
    /**
     * Show a toast message.
     * @param {string} message - Notification text.
     * @param {'success'|'error'|'info'} [type='info'] - Type of toast.
     * @param {number} [duration=3000] - Duration in milliseconds before auto-dismiss.
     * @returns {HTMLElement} The created toast element.
     */
    show(message, type = 'info', duration = 3000) {
      const container = getOrCreateContainer();

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'alert');

      let icon = 'ℹ️';
      if (type === 'success') icon = '✓';
      else if (type === 'error') icon = '✕';
      else if (type === 'info') icon = 'ℹ️';

      toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button type="button" class="toast-close-btn" aria-label="Close notification">&times;</button>
      `;

      let dismissed = false;
      function dismiss() {
        if (dismissed) return;
        dismissed = true;
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hiding');

        const removeElement = () => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        };

        toast.addEventListener('transitionend', removeElement, { once: true });
        setTimeout(removeElement, 350); // Fallback if transitionend does not fire
      }

      const closeBtn = toast.querySelector('.toast-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss();
        });
      }

      container.appendChild(toast);

      // Trigger enter transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          toast.classList.add('toast-visible');
        });
      });

      if (duration > 0) {
        setTimeout(dismiss, duration);
      }

      return toast;
    },

    success(message, duration = 3000) {
      return this.show(message, 'success', duration);
    },

    error(message, duration = 3000) {
      return this.show(message, 'error', duration);
    },

    info(message, duration = 3000) {
      return this.show(message, 'info', duration);
    }
  };

  window.Toast = Toast;
})();
