import Parser from 'rss-parser';
import { getSettings, type FeedSetting } from './config';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure']
    ]
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  // Increase timeout
  timeout: 10000
});

export async function fetchAllFeeds() {
  const settings = await getSettings();
  const enabledFeeds = settings.feeds.filter(f => f.enabled);

  const fetchPromises = enabledFeeds.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      return { feedInfo: feed, data: parsed };
    } catch (error: any) {
      console.error(`Error fetching feed ${feed.name} (${feed.url}): ${error.message}`);
      return { feedInfo: feed, data: { items: [] } };
    }
  });

  const results = await Promise.all(fetchPromises);
  return results;
}
