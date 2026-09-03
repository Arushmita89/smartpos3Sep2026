import { supabase } from '@/lib/supabase';

const OTP_EXPIRY_MINUTES = 10;

export function generateOtp(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export async function storeOtp(
  email: string,
  purpose: 'signup' | 'password_reset'
): Promise<string> {
  await supabase
    .from('email_otps' as any)
    .update({ verified: true })
    .eq('email', email.toLowerCase().trim())
    .eq('purpose', purpose)
    .eq('verified', false);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase.from('email_otps' as any).insert({
    email: email.toLowerCase().trim(),
    code,
    purpose,
    expires_at: expiresAt,
  });

  if (error) throw new Error('Failed to generate OTP');
  return code;
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: 'signup' | 'password_reset'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_otps' as any)
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('purpose', purpose)
    .eq('code', code)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Invalid or expired OTP code');
  }

  await supabase
    .from('email_otps' as any)
    .update({ verified: true })
    .eq('id', data.id);

  return true;
}
