import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusDisplay } from './StatusDisplay.js';

describe('StatusDisplay', () => {
  let container;
  let statusDisplay;

  beforeEach(() => {
    // Create a mock status container
    container = document.createElement('div');
    container.id = 'status';
    document.body.appendChild(container);
    
    statusDisplay = new StatusDisplay('status');
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  describe('constructor', () => {
    it('should throw error if container not found', () => {
      expect(() => new StatusDisplay('nonexistent')).toThrow(
        'Status container with id "nonexistent" not found'
      );
    });

    it('should initialize with valid container', () => {
      expect(statusDisplay.container).toBe(container);
    });
  });

  describe('showLoading', () => {
    it('should display loading message with spinner', () => {
      statusDisplay.showLoading('Loading cameras...');
      
      expect(container.innerHTML).toContain('status-loading');
      expect(container.innerHTML).toContain('spinner');
      expect(container.innerHTML).toContain('Loading cameras...');
    });

    it('should replace previous message', () => {
      statusDisplay.showError('Error message');
      statusDisplay.showLoading('Loading...');
      
      expect(container.innerHTML).toContain('status-loading');
      expect(container.innerHTML).not.toContain('status-error');
      expect(container.innerHTML).not.toContain('Error message');
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      statusDisplay.showError('Failed to load data');
      
      expect(container.innerHTML).toContain('status-error');
      expect(container.innerHTML).toContain('Failed to load data');
    });

    it('should not include spinner', () => {
      statusDisplay.showError('Error message');
      
      expect(container.innerHTML).not.toContain('spinner');
    });

    it('should replace previous message', () => {
      statusDisplay.showLoading('Loading...');
      statusDisplay.showError('Error occurred');
      
      expect(container.innerHTML).toContain('status-error');
      expect(container.innerHTML).not.toContain('status-loading');
    });
  });

  describe('showNotice', () => {
    it('should display notice message', () => {
      statusDisplay.showNotice('Using cached data');
      
      expect(container.innerHTML).toContain('status-notice');
      expect(container.innerHTML).toContain('Using cached data');
    });

    it('should not include spinner', () => {
      statusDisplay.showNotice('Notice message');
      
      expect(container.innerHTML).not.toContain('spinner');
    });

    it('should replace previous message', () => {
      statusDisplay.showError('Error');
      statusDisplay.showNotice('Notice');
      
      expect(container.innerHTML).toContain('status-notice');
      expect(container.innerHTML).not.toContain('status-error');
    });
  });

  describe('hide', () => {
    it('should clear all status messages', () => {
      statusDisplay.showLoading('Loading...');
      statusDisplay.hide();
      
      expect(container.innerHTML).toBe('');
    });

    it('should work when no message is displayed', () => {
      statusDisplay.hide();
      
      expect(container.innerHTML).toBe('');
    });

    it('should clear error messages', () => {
      statusDisplay.showError('Error');
      statusDisplay.hide();
      
      expect(container.innerHTML).toBe('');
    });

    it('should clear notice messages', () => {
      statusDisplay.showNotice('Notice');
      statusDisplay.hide();
      
      expect(container.innerHTML).toBe('');
    });
  });

  describe('message types are visually distinct', () => {
    it('should use different CSS classes for each message type', () => {
      statusDisplay.showLoading('Loading');
      expect(container.querySelector('.status-loading')).toBeTruthy();
      
      statusDisplay.showError('Error');
      expect(container.querySelector('.status-error')).toBeTruthy();
      
      statusDisplay.showNotice('Notice');
      expect(container.querySelector('.status-notice')).toBeTruthy();
    });
  });
});
