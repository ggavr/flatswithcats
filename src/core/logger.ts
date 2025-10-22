type LogLevel = 'info' | 'warn' | 'error';
interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  withContext: (context: Record<string, unknown>) => Logger;
}

const formatContext = (context?: Record<string, unknown>) => {
  if (!context || Object.keys(context).length === 0) return '';
  return JSON.stringify(context);
};

const emit = (level: LogLevel, context: Record<string, unknown> | undefined, args: unknown[]) => {
  const prefix = level === 'info' ? '[i]' : level === 'warn' ? '[!]' : '[x]';
  const ctx = formatContext(context);
  const suffix = ctx ? ` ${ctx}` : '';
  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  target(prefix, ...args, suffix);
};

const createLogger = (context?: Record<string, unknown>): Logger => {
  const scoped = context ?? {};
  const base = {
    info: (...args: unknown[]) => emit('info', scoped, args),
    warn: (...args: unknown[]) => emit('warn', scoped, args),
    error: (...args: unknown[]) => emit('error', scoped, args)
  };
  return Object.assign(base, {
    withContext: (next: Record<string, unknown>) => createLogger({ ...scoped, ...next })
  });
};

export const log: Logger = createLogger();
