import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'email' | null;
  const next = searchParams.get('next') ?? '/account';

  const supabase = await createClient();

  // Flow 1: PKCE code exchange (e.g., from email confirmation with PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Flow 2: Token hash verification (e.g., from email confirmation link)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      const redirectTo = type === 'recovery' ? '/account/passwort-neu' : next;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Flow 3: User might already be authenticated (session set via redirect)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Nothing worked — redirect to login with error
  return NextResponse.redirect(`${origin}/account/login?error=auth`);
}
