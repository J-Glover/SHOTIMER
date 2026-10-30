export function dashboardAccess(loading: boolean, signedIn: boolean, intent: string | null) {
  if (loading) return 'loading';
  if (intent === 'reset') return 'reset';
  return signedIn ? 'ready' : 'login';
}

export function oauthReturnError(search: string, hash: string): string {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const description = query.get('error_description') || fragment.get('error_description');
  const code = query.get('error') || fragment.get('error');
  if (!description && !code) return '';
  return `Sign-in could not be completed. ${description || code}`.slice(0, 500);
}
