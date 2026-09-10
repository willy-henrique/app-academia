/**
 * Cabeçalhos de segurança da aplicação.
 *
 * A CSP é escrita para o que o app realmente usa: Firebase Auth, Firestore,
 * Storage e Functions. Em desenvolvimento o Next precisa de `unsafe-eval` para
 * o refresh rápido; em produção isso sai. HSTS só é enviado em produção, para
 * não travar `http://localhost` no ambiente local.
 */

const firebaseConnectSources = [
  "https://*.googleapis.com",
  "https://*.firebaseio.com",
  "https://*.cloudfunctions.net",
  "https://firebasestorage.googleapis.com",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "wss://*.firebaseio.com",
];

// Firebase Auth loads Google's supported web helper for popup/redirect OAuth.
// These are intentionally limited to the hosts used by that helper.
const googleAuthSources = [
  "https://apis.google.com",
  "https://www.gstatic.com",
  "https://accounts.google.com",
];

export function buildContentSecurityPolicy(isProduction: boolean): string {
  const scriptSrc = isProduction
    ? ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.gstatic.com"]
    : [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://apis.google.com",
        "https://www.gstatic.com",
      ];

  const connectSrc = isProduction
    ? ["'self'", ...firebaseConnectSources, ...googleAuthSources]
    : [
        "'self'",
        "ws://localhost:*",
        "http://localhost:*",
        "http://127.0.0.1:*",
        ...firebaseConnectSources,
        ...googleAuthSources,
      ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com",
    "media-src 'self' https://firebasestorage.googleapis.com",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export type SecurityHeader = Readonly<{ key: string; value: string }>;

export function buildSecurityHeaders(isProduction: boolean): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(isProduction) },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
