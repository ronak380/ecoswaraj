/**
 * @fileoverview Custom Logger service that wraps console commands.
 * Prevents direct console.log usage and handles logs processing.
 */

export class Logger {
  private static isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log informational message.
   * @param message - The main log message.
   * @param optionalParams - Additional details to include.
   */
  public static info(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] [${new Date().toISOString()}] ${message}`, ...optionalParams);
    }
  }

  /**
   * Log warning message.
   * @param message - The warning message.
   * @param optionalParams - Additional details to include.
   */
  public static warn(message: string, ...optionalParams: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...optionalParams);
  }

  /**
   * Log error message.
   * @param message - The error message.
   * @param optionalParams - Additional details to include.
   */
  public static error(message: string, ...optionalParams: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, ...optionalParams);
  }

  /**
   * Log debug message (only in development).
   * @param message - The debug message.
   * @param optionalParams - Additional details to include.
   */
  public static debug(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...optionalParams);
    }
  }
}
