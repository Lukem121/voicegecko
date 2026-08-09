import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseLogger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

function wrapMsgFirst(fn: pino.LogFn): pino.LogFn {
  return ((first?: unknown, second?: unknown, ...rest: unknown[]) => {
    // Support message-first signature: log.info('message', { key: value })
    if (
      typeof first === 'string' &&
      second !== undefined &&
      second !== null &&
      typeof second === 'object' &&
      !Array.isArray(second)
    ) {
      return (fn as unknown as (...args: unknown[]) => void).call(
        baseLogger,
        second,
        first,
        ...rest
      );
    }
    // Default pino signature (object first, then message) and other forms
    return (fn as unknown as (...args: unknown[]) => void).call(
      baseLogger,
      first,
      second,
      ...rest
    );
  }) as pino.LogFn;
}

export const log = Object.assign(baseLogger, {
  info: wrapMsgFirst(baseLogger.info.bind(baseLogger)),
  warn: wrapMsgFirst(baseLogger.warn.bind(baseLogger)),
  error: wrapMsgFirst(baseLogger.error.bind(baseLogger)),
  debug: wrapMsgFirst(baseLogger.debug.bind(baseLogger)),
});
