/**
 * Unit tests for FilterController
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import FilterController from './FilterController.js';

describe('FilterController', () => {
  let controller;
  let container;
  let mockCallback;

  beforeEach(() => {
    controller = new FilterController();
    
    // Create mock DOM structure
    container = document.createElement('div');
    container.innerHTML = `
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="oakland">Oakland</button>
      <button class="filter-btn" data-filter="san-francisco">San Francisco</button>
    `;
    
    mockCallback = vi.fn();
  });

  describe('init', () => {
    it('should initialize with correct filter buttons', () => {
      controller.init(container, mockCallback);
      
      expect(controller.filterButtons).toHaveLength(3);
      expect(controller.filterButtons[0].getAttribute('data-filter')).toBe('all');
      expect(controller.filterButtons[1].getAttribute('data-filter')).toBe('oakland');
      expect(controller.filterButtons[2].getAttribute('data-filter')).toBe('san-francisco');
    });

    it('should set initial active filter based on active class', () => {
      controller.init(container, mockCallback);
      
      expect(controller.getActiveFilter()).toBe('all');
    });

    it('should bind click events to filter buttons', () => {
      controller.init(container, mockCallback);
      
      const oaklandButton = controller.filterButtons[1];
      oaklandButton.click();
      
      expect(mockCallback).toHaveBeenCalledWith('oakland');
      expect(controller.getActiveFilter()).toBe('oakland');
    });

    it('should update active filter when button is clicked', () => {
      controller.init(container, mockCallback);
      
      const sfButton = controller.filterButtons[2];
      sfButton.click();
      
      expect(controller.getActiveFilter()).toBe('san-francisco');
      expect(mockCallback).toHaveBeenCalledWith('san-francisco');
    });
  });

  describe('getActiveFilter', () => {
    it('should return default filter value', () => {
      expect(controller.getActiveFilter()).toBe('all');
    });

    it('should return current active filter after initialization', () => {
      // Set Oakland as active
      container.querySelector('[data-filter="all"]').classList.remove('active');
      container.querySelector('[data-filter="oakland"]').classList.add('active');
      
      controller.init(container, mockCallback);
      
      expect(controller.getActiveFilter()).toBe('oakland');
    });
  });

  describe('setActiveFilter', () => {
    beforeEach(() => {
      controller.init(container, mockCallback);
    });

    it('should update active filter state', () => {
      controller.setActiveFilter('oakland');
      
      expect(controller.getActiveFilter()).toBe('oakland');
    });

    it('should add active class to selected button', () => {
      controller.setActiveFilter('oakland');
      
      const oaklandButton = container.querySelector('[data-filter="oakland"]');
      expect(oaklandButton.classList.contains('active')).toBe(true);
    });

    it('should remove active class from previously active button', () => {
      controller.setActiveFilter('oakland');
      
      const allButton = container.querySelector('[data-filter="all"]');
      expect(allButton.classList.contains('active')).toBe(false);
    });

    it('should handle all three filter values', () => {
      // Test 'all'
      controller.setActiveFilter('all');
      expect(controller.getActiveFilter()).toBe('all');
      expect(container.querySelector('[data-filter="all"]').classList.contains('active')).toBe(true);
      
      // Test 'oakland'
      controller.setActiveFilter('oakland');
      expect(controller.getActiveFilter()).toBe('oakland');
      expect(container.querySelector('[data-filter="oakland"]').classList.contains('active')).toBe(true);
      expect(container.querySelector('[data-filter="all"]').classList.contains('active')).toBe(false);
      
      // Test 'san-francisco'
      controller.setActiveFilter('san-francisco');
      expect(controller.getActiveFilter()).toBe('san-francisco');
      expect(container.querySelector('[data-filter="san-francisco"]').classList.contains('active')).toBe(true);
      expect(container.querySelector('[data-filter="oakland"]').classList.contains('active')).toBe(false);
    });
  });

  describe('filter change callback', () => {
    beforeEach(() => {
      controller.init(container, mockCallback);
    });

    it('should call callback when filter changes via button click', () => {
      const oaklandButton = controller.filterButtons[1];
      oaklandButton.click();
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('oakland');
    });

    it('should not call callback when setActiveFilter is called directly', () => {
      controller.setActiveFilter('oakland');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should call callback with correct filter value for each button', () => {
      controller.filterButtons[0].click();
      expect(mockCallback).toHaveBeenLastCalledWith('all');
      
      controller.filterButtons[1].click();
      expect(mockCallback).toHaveBeenLastCalledWith('oakland');
      
      controller.filterButtons[2].click();
      expect(mockCallback).toHaveBeenLastCalledWith('san-francisco');
      
      expect(mockCallback).toHaveBeenCalledTimes(3);
    });
  });

  describe('UI state management', () => {
    beforeEach(() => {
      controller.init(container, mockCallback);
    });

    it('should maintain only one active button at a time', () => {
      controller.setActiveFilter('oakland');
      
      const activeButtons = Array.from(container.querySelectorAll('.filter-btn.active'));
      expect(activeButtons).toHaveLength(1);
      expect(activeButtons[0].getAttribute('data-filter')).toBe('oakland');
    });

    it('should update UI correctly when clicking multiple buttons in sequence', () => {
      // Click Oakland
      controller.filterButtons[1].click();
      expect(container.querySelector('[data-filter="oakland"]').classList.contains('active')).toBe(true);
      expect(container.querySelectorAll('.filter-btn.active')).toHaveLength(1);
      
      // Click San Francisco
      controller.filterButtons[2].click();
      expect(container.querySelector('[data-filter="san-francisco"]').classList.contains('active')).toBe(true);
      expect(container.querySelector('[data-filter="oakland"]').classList.contains('active')).toBe(false);
      expect(container.querySelectorAll('.filter-btn.active')).toHaveLength(1);
      
      // Click All
      controller.filterButtons[0].click();
      expect(container.querySelector('[data-filter="all"]').classList.contains('active')).toBe(true);
      expect(container.querySelector('[data-filter="san-francisco"]').classList.contains('active')).toBe(false);
      expect(container.querySelectorAll('.filter-btn.active')).toHaveLength(1);
    });
  });
});
