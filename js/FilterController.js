/**
 * FilterController - Manages city filter UI and state
 * 
 * Responsibilities:
 * - Initialize filter buttons and bind click events
 * - Track active filter state
 * - Update button styling based on active filter
 * - Notify parent component when filter changes
 */

class FilterController {
  constructor() {
    this.activeFilter = 'all';
    this.onFilterChange = null;
    this.filterButtons = [];
  }

  /**
   * Initialize filter buttons and bind click events
   * @param {HTMLElement} container - Container element with filter buttons
   * @param {Function} onFilterChange - Callback function called with new filter value
   */
  init(container, onFilterChange) {
    this.onFilterChange = onFilterChange;
    
    // Get all filter buttons from the container
    this.filterButtons = Array.from(container.querySelectorAll('[data-filter]'));
    
    // Bind click events to each button
    this.filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-filter');
        this.setActiveFilter(filter);
        
        // Call the callback with the new filter value
        if (this.onFilterChange) {
          this.onFilterChange(filter);
        }
      });
    });
    
    // Set initial active filter based on which button has 'active' class
    const activeButton = this.filterButtons.find(btn => btn.classList.contains('active'));
    if (activeButton) {
      this.activeFilter = activeButton.getAttribute('data-filter');
    }
  }

  /**
   * Get current active filter
   * @returns {string} Current filter value ('all', 'oakland', 'san-francisco')
   */
  getActiveFilter() {
    return this.activeFilter;
  }

  /**
   * Set active filter and update button styling
   * @param {string} filter - Filter value ('all', 'oakland', 'san-francisco')
   */
  setActiveFilter(filter) {
    this.activeFilter = filter;
    
    // Update button styling - remove 'active' class from all buttons
    this.filterButtons.forEach(button => {
      button.classList.remove('active');
    });
    
    // Add 'active' class to the selected button
    const activeButton = this.filterButtons.find(
      btn => btn.getAttribute('data-filter') === filter
    );
    
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }
}

export default FilterController;
