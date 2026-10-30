// Static hosts choose index.html without looking at its query string. The public
// entry must therefore recognise app routes and OAuth callbacks itself.
export function needsApplication(search: string, hash: string): boolean {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return ['view', 'room', 'auth', 'code', 'error', 'error_description'].some(key => query.has(key)) ||
    ['access_token', 'refresh_token', 'error', 'error_description', 'type'].some(key => fragment.has(key));
}

export async function mountApplication(document: Document, load: () => Promise<unknown>) {
  // Remove public-site styles before Vite imports the console's stylesheet.
  document.querySelectorAll('link[rel="stylesheet"], style').forEach(element => element.remove());
  document.documentElement.classList.add('dark');
  document.body.className = '';
  document.title = 'Shotimer — Sign in & rooms';
  const root = document.createElement('div');
  root.id = 'root';
  root.textContent = 'Opening Shotimer…';
  document.body.replaceChildren(root);
  try {
    await load();
  } catch {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = 'Shotimer could not load. Please refresh to try again.';
    const retry = document.createElement('button');
    retry.textContent = 'Refresh Shotimer';
    retry.onclick = () => document.defaultView?.location.reload();
    root.replaceChildren(message, retry);
  }
}
