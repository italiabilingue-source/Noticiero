import type { APIRoute } from 'astro';
import { getNews } from '../../lib/newsService';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.has('refresh');
  const educationalMode = url.searchParams.has('educational');
  
  try {
    let news = await getNews(forceRefresh);
    
    // If educational mode is on, filter for only educational-friendly categories
    if (educationalMode) {
      news = news.filter(n => ['tecnología', 'cultura', 'sociedad', 'economía'].includes(n.category));
    }

    return new Response(JSON.stringify({
      success: true,
      count: news.length,
      timestamp: new Date().toISOString(),
      data: news
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch news data'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
