export const listSbCookieNames = (): string[] => {
  if (typeof document === 'undefined') return [];
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name.startsWith('sb-'));
};

export const summarizeUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const params = new URLSearchParams(url.search);
    const code = params.get('code');
    const state = params.get('state');
    const next = params.get('next');

    return {
      paramKeys: Array.from(params.keys()),
      hasCode: Boolean(code),
      codeLen: code?.length ?? 0,
      hasState: Boolean(state),
      stateLen: state?.length ?? 0,
      hasNext: Boolean(next)
    };
  } catch {
    return {
      paramKeys: [],
      hasCode: false,
      codeLen: 0,
      hasState: false,
      stateLen: 0,
      hasNext: false
    };
  }
};

export const maskUrlForLog = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const params = new URLSearchParams(url.search);
    const maskedParams = new URLSearchParams();

    for (const [key, value] of params.entries()) {
      maskedParams.set(key, `<redacted:${value.length}>`);
    }

    const query = maskedParams.toString();
    return query
      ? `${url.protocol}//${url.host}${url.pathname}?${query}`
      : `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return rawUrl.replace(/([?&][^=]+=)[^&]*/g, (match, prefix) => `${prefix}<redacted>`);
  }
};
