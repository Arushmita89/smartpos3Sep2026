export const OWNER_LOGIN = (
  process.env.NEXT_PUBLIC_ALTASOFTWARE_OWNER_LOGIN || ''
)
  .toLowerCase()
  .trim();

export function isOwner(loginName?: string | null): boolean {
  return (
    !!OWNER_LOGIN &&
    !!loginName &&
    loginName.toLowerCase().trim() === OWNER_LOGIN
  );
}
