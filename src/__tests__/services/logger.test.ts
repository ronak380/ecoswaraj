/**
 * @fileoverview Unit tests for the custom Logger service.
 */

import { Logger } from '@/services/logger';

describe('Logger Service', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it('should call console.info when info is invoked', () => {
    Logger.info('Test info message', { details: 'info-test' });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      expect.any(Object)
    );
  });

  it('should call console.warn when warn is invoked', () => {
    Logger.warn('Test warn message');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]')
    );
  });

  it('should call console.error when error is invoked', () => {
    Logger.error('Test error message', new Error('Fail'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      expect.any(Error)
    );
  });

  it('should call console.debug when debug is invoked', () => {
    Logger.debug('Test debug message');
    expect(consoleDebugSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]')
    );
  });
});
