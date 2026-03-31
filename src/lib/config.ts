import fs from 'node:fs/promises';
import path from 'node:path';

// En Vercel (serverless), usar /tmp que es escribible
// En desarrollo, usar ./data
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel
  ? '/tmp/noticias-bili'
  : path.resolve(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

export interface FeedSetting {
  id: string;
  name: string;
  url: string;
  country: string;
  enabled: boolean;
}

export interface SiteSettings {
  feeds: FeedSetting[];
  youtubeUrl: string;
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    // Default settings if file doesn't exist
    return {
      feeds: [
        { id: 'lanacion', name: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml', country: 'AR', enabled: true },
        { id: 'repubblica', name: 'La Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml', country: 'IT', enabled: true }
      ],
      youtubeUrl: ''
    };
  }
}

export async function saveSettings(settings: SiteSettings) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch(e) {}
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

export const FORBIDDEN_WORDS = [
  "robo", "asesinato", "crimen", "violencia", "muerte", "policial", "mató", "tiroteo", "violación", "abuso", "sangre", "secuestro", "narcotráfico", "cadáver", "homicidio", "femicidio", "accidente", "choque", "tragedia"
];

// Entertainment/Celebrity gossip words to filter out
export const GOSSIP_WORDS = [
  "famoso", "actriz", "actor", "telenovela", "reality", "influencer", "youtube", "instagram", "tiktok", "cantante", "música", "concierto", "gossip", "chisme", "divorcio", "relación", "novio", "novia", "boda", "pareja", "celebridad", "famosa", "farándula", "espectáculos", "entretenimiento", "videoclip", "disco", "artista", "estrella de cine", "hollywood", "reality show", "gran hermano", "casa de los famosos", "survivor", "el bachelor", "amor a ciegas", "love is blind", "repechaje", "eliminado", "gala", "tenista famoso", "futbolista novia", "juego de azar"
];

export const CATEGORIES = ["política", "economía", "sociedad", "tecnología", "cultura", "deporte", "gastronomía", "salud", "viajes", "medioambiente", "internacional"];

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  contentSnippet: string;
  source: string;
  country: string;
  category: string;
  imageUrl?: string;
  isFeatured: boolean;
  displayMode?: 'short' | 'medium' | 'long';
}
