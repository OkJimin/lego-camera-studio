// crypto.randomUUID() only exists in secure contexts (https, or the
// localhost special-case) — it throws on a plain-HTTP LAN address, which is
// exactly how a phone reaches this app during pairing. These ids are just
// local React/zustand keys, not security-sensitive, so a simple generator
// that works everywhere is enough.
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
