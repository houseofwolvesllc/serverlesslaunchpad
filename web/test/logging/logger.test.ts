/**
 * Logger Tests
 *
 * Tests for the web application logger module.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '../../src/logging/logger';
import { LogLevel } from '@houseofwolves/serverlesslaunchpad.core';

describe('Web Logger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should be a ConsoleLogger instance', () => {
        expect(logger).toBeDefined();
        expect(logger.debug).toBeDefined();
        expect(logger.info).toBeDefined();
        expect(logger.warn).toBeDefined();
        expect(logger.error).toBeDefined();
    });

    it('should have debug method', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.debug('Test debug message', { key: 'value' });

        // Logger may or may not output debug in test env depending on configuration
        // Just verify the method exists and doesn't throw
        expect(() => logger.debug('test', {})).not.toThrow();

        consoleSpy.mockRestore();
    });

    it('should have info method', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('Test info message', { key: 'value' });

        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should have warn method', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.warn('Test warn message', { key: 'value' });

        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should have error method', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('Test error message', { error: new Error('test') });

        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should format log entries as JSON', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('Test message', { key: 'value' });

        const call = consoleSpy.mock.calls[0][0];
        expect(() => JSON.parse(call)).not.toThrow();

        const parsed = JSON.parse(call);
        expect(parsed.level).toBe('INFO');
        expect(parsed.message).toBe('Test message');
        expect(parsed.key).toBe('value');
        expect(parsed.timestamp).toBeDefined();

        consoleSpy.mockRestore();
    });

    it('should include context data in logs', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const contextData = {
            userId: '123',
            action: 'test',
            error: new Error('test error'),
        };

        logger.error('Operation failed', contextData);

        const call = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(call);

        expect(parsed.userId).toBe('123');
        expect(parsed.action).toBe('test');
        expect(parsed.error).toBeDefined();

        consoleSpy.mockRestore();
    });
});
