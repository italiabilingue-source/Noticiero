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
        // ARGENTINA - La Nación (específicas por categoría)
        { id: 'lanacion_politica', name: 'La Nación - Política', url: 'https://www.lanacion.com.ar/politica/rss/', country: 'AR', enabled: true },
        { id: 'lanacion_economia', name: 'La Nación - Economía', url: 'https://www.lanacion.com.ar/economia/rss/', country: 'AR', enabled: true },
        { id: 'lanacion_tecnologia', name: 'La Nación - Tecnología', url: 'https://www.lanacion.com.ar/tecnologia/rss/', country: 'AR', enabled: true },
        { id: 'lanacion_sociedad', name: 'La Nación - Sociedad', url: 'https://www.lanacion.com.ar/sociedad/rss/', country: 'AR', enabled: true },

        // INTERNACIONAL - BBC
        { id: 'bbc_world', name: 'BBC - World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', country: 'GB', enabled: true },
        { id: 'bbc_tech', name: 'BBC - Technology', url: 'http://feeds.bbci.co.uk/news/technology/rss.xml', country: 'GB', enabled: true },

        // INTERNACIONAL - Reuters
        { id: 'reuters_world', name: 'Reuters - World', url: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best', country: 'US', enabled: true },
        { id: 'reuters_business', name: 'Reuters - Business', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best', country: 'US', enabled: true },

        // ITALIA
        { id: 'corriere', name: 'Corriere della Sera', url: 'https://xml2.corriereobjects.it/rss/homepage.xml', country: 'IT', enabled: true },
        { id: 'repubblica', name: 'La Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml', country: 'IT', enabled: true },

        // TECNOLOGÍA (calidad alta)
        { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', country: 'US', enabled: true },
        { id: 'theverge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', country: 'US', enabled: true }
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
  "sicario", "cartel", "narcotráfico", "trata de personas", "mafia", "banda criminal",
  "organización criminal", "crimen organizado"
];

// Entertainment/Celebrity gossip words to filter out
export const GOSSIP_WORDS = [
  "famoso", "actriz", "actor", "telenovela", "reality", "influencer", "youtube", "instagram", "tiktok", "cantante", "música", "concierto", "gossip", "chisme", "divorcio", "relación", "novio", "novia", "boda", "pareja", "celebridad", "famosa", "farándula", "espectáculos", "entretenimiento", "videoclip", "disco", "artista", "estrella de cine", "hollywood", "reality show", "gran hermano", "casa de los famosos", "survivor", "el bachelor", "amor a ciegas", "love is blind", "repechaje", "eliminado", "gala", "tenista famoso", "futbolista novia", "juego de azar"
];

// Palabras que indican "basura" - noticias sin contenido real (live blogs, minuto a minuto, coberturas)
export const JUNK_NEWS_PATTERNS = [
  "minuto a minuto", "al minuto", "en vivo", "en directo", "live blog", "live blogging",
  "últimas noticias", "últimas novedades", "últimas horas", "últimas actualizaciones",
  "seguí acá", "seguimos", "cobertura", "todo lo que pasa", "todo lo que sucede",
  "aquí van", "en este directo", "minuto tras minuto", "momento a momento",
  "actualización en vivo", "actualización por actualización", "se viene"
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
