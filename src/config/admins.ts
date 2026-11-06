export const ADMIN_EMAILS: string[] = [
  'kevenlucas915@gmail.com',
  'damiana30@iclou.com',
  'damiana30@icloud.com'
];

/**
 * Verifica se um determinado e-mail pertence à lista de administradores
 */
export function ehAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const limpo = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adm => adm.toLowerCase().trim() === limpo);
}

