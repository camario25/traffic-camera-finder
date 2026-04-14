/**
 * StatusDisplay - Manages loading, error, and notice messages
 */
export class StatusDisplay {
  constructor(containerId = 'status') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Status container with id "${containerId}" not found`);
    }
  }

  /**
   * Show loading message with spinner
   * @param {string} message - Loading message to display
   */
  showLoading(message) {
    this.container.innerHTML = `
      <div class="status-message status-loading">
        <span class="spinner"></span>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="status-message status-error">
        ${message}
      </div>
    `;
  }

  /**
   * Show informational notice
   * @param {string} message - Notice message to display
   */
  showNotice(message) {
    this.container.innerHTML = `
      <div class="status-message status-notice">
        ${message}
      </div>
    `;
  }

  /**
   * Hide all status messages
   */
  hide() {
    this.container.innerHTML = '';
  }
}
