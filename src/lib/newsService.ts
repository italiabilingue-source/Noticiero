import { fetchAllFeeds } from './fetcher';
import { processNewsData } from './processor';
import type { NewsItem } from './config';

// In-memory cache
let cachedNews: NewsItem[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getNews(forceRefresh = false): Promise<NewsItem[]> {
  const now = Date.now();
  
  if (!forceRefresh && cachedNews && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return cachedNews;
  }

  try {
    const feedsData = await fetchAllFeeds();
    const processedNews = processNewsData(feedsData);
    
    // Additional categorization rules based on UI needs can go here
    
    cachedNews = processedNews;
    lastFetchTime = now;
    
    return cachedNews;
  } catch (error) {
    console.error("Failed to fetch news:", error);
    // Return stale cache if available, else empty array
    return cachedNews || [];
  }
}
