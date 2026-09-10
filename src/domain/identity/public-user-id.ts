const publicUserIdPrefix = "WT";
const publicUserIdGroupLength = 4;
const publicUserIdGroups = 2;
const publicUserIdAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePublicUserId(publicUserId: string): string {
  return publicUserId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function formatPublicUserId(normalizedPublicUserId: string): string {
  const normalized = normalizePublicUserId(normalizedPublicUserId);
  const withoutPrefix = normalized.startsWith(publicUserIdPrefix)
    ? normalized.slice(publicUserIdPrefix.length)
    : normalized;
  const chunks = withoutPrefix.match(new RegExp(`.{1,${publicUserIdGroupLength}}`, "g")) ?? [];
  return [publicUserIdPrefix, ...chunks.slice(0, publicUserIdGroups)].join("-");
}

export function isPublicUserId(candidate: string): boolean {
  return /^WT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(candidate);
}

export function generatePublicUserId(randomSource: () => number = Math.random): string {
  const characters = Array.from({ length: publicUserIdGroupLength * publicUserIdGroups }, () => {
    const index = Math.floor(randomSource() * publicUserIdAlphabet.length);
    return publicUserIdAlphabet[index];
  }).join("");

  return formatPublicUserId(`${publicUserIdPrefix}${characters}`);
}

export function normalizeStoredPublicUserId(publicUserId: string): string {
  return normalizePublicUserId(publicUserId);
}
