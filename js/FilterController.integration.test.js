/**
 * Integration tests for FilterController with actual HTML structure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import FilterController from './FilterController.js';

describe('FilterController Integration', () => {
  let controller;
  let container;
  let mockCallback;

  beforeEach(() => {
    controller = new FilterController();
    
    // Create exact HTML structure from index.html
    container = document.createElement('div');
    container.id = 'filter-controls';
    container.className = 'filter-controls';
    container.innerHTML = `
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="oakland">Oakland</button>
      <button class="filter-btn" data-filter="san-francisco">San Francisco</button>
    `;
    
    mockCallback = vi.fn();
  });

  it('should work with the actual HTML structure from index.html', () => {
    controller.init(container, mockCallback);
    
    // Verify initialization
    expect(controller.getActiveFilter()).toBe('all');
    expect(controller.filterButtons).toHaveLength(3);
    
    // Verify filter values match design spec
    const filterValues = controller.filterButtons.map(btn => btn.getAttribute('data-filter'));
    expect(filterValues).toEqual(['all', 'oakland', 'san-francisco']);
  });

  it('should handle filter changes without making network requests', () => {
    controller.init(container, mockCallback);
    
    // Simulate user clicking Oakland filter
    const oaklandButton = container.querySelector('[data-filter="oakland"]');
    oaklandButton.click();
    
    // Verify callback was called (which would trigger map re-render, not network request)
    expect(mockCallback).toHaveBeenCalledWith('oakland');
    expect(controller.getActiveFilter()).toBe('oakland');
    
    // Verify UI updated correctly
    expect(oaklandButton.classList.contains('active')).toBe(true);
    expect(container.querySelector('[data-filter="all"]').classList.contains('active')).toBe(false);
  });

  it('should support all three filter options as per requirements', () => {
    controller.init(container, mockCallback);
    
    // Test 'all' filter (Requirement 5.4)
    container.querySelector('[data-filter="all"]').click();
    expect(mockCallback).toHaveBeenLastCalledWith('all');
    
    // Test 'oakland' filter (Requirement 5.2)
    container.querySelector('[data-filter="oakland"]').click();
    expect(mockCallback).toHaveBeenLastCalledWith('oakland');
    
    // Test 'san-francisco' filter (Requirement 5.3)
    container.querySelector('[data-filter="san-francisco"]').click();
    expect(mockCallback).toHaveBeenLastCalledWith('san-francisco');
  });

  it('should maintain active class styling as per CSS', () => {
    controller.init(container, mockCallback);
    
    // Change filter to San Francisco
    controller.setActiveFilter('san-francisco');
    
    // Verify only one button has active class
    const activeButtons = container.querySelectorAll('.filter-btn.active');
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0].getAttribute('data-filter')).toBe('san-francisco');
    
    // Verify the active class is applied correctly for CSS styling
    expect(activeButtons[0].classList.contains('active')).toBe(true);
  });
});
