import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../i18n';
import { ToastProvider } from '../components/Toast';

/** Providers a screen needs in a test: data, safe area, toasts. */
export function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

type Reply = { status?: number; body?: unknown };

type Route = {
  method: string;
  /** Matched against the path and query, e.g. /^\/tags\/t1$/. */
  path: RegExp;
  /** A fixed answer, or one that depends on the request. Default: 200 with no body. */
  reply?: Reply | ((call: FetchCall) => Reply);
};

export type FetchCall = {
  method: string;
  path: string;
  ifMatch?: string;
  body?: Record<string, unknown>;
};

/** A fake API: answers each request with the first matching route and records the calls. */
export function fakeApi(routes: Route[]) {
  const calls: FetchCall[] = [];
  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const headers = (init.headers ?? {}) as Record<string, string>;
    const call: FetchCall = {
      method: init.method ?? 'GET',
      path,
      ifMatch: headers['If-Match'],
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
    calls.push(call);
    const route = routes.find((r) => r.method === call.method && r.path.test(path));
    if (!route) throw new Error(`no fake route for ${call.method} ${path}`);
    const { status = 200, body } =
      typeof route.reply === 'function' ? route.reply(call) : (route.reply ?? {});
    return {
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
    };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { calls };
}
