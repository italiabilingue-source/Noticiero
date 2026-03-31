import type { APIRoute } from 'astro';
import { getSettings, saveSettings } from '../../lib/config';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  // Validar que el usuario tiene sesión activa
  const sessionCookie = cookies.get('admin_session');

  if (!sessionCookie || sessionCookie.value !== 'true') {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
  }

  const data = await request.formData();

  const currentSettings = await getSettings();
  const updatedFeeds = currentSettings.feeds.map(f => {
    return {
      ...f,
      enabled: data.get(`enabled_${f.id}`) === 'on',
      url: data.get(`url_${f.id}`) as string || f.url
    };
  });

  const youtubeUrl = data.get('youtubeUrl') as string || '';

  await saveSettings({
    feeds: updatedFeeds,
    youtubeUrl: youtubeUrl
  });

  return redirect('/admin?success=true');
}
