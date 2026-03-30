import type { APIRoute } from 'astro';
import { getSettings, saveSettings } from '../../lib/config';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const password = data.get('password');

  if (password !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 401 });
  }

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
