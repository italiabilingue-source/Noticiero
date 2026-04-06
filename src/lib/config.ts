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
// IMPORTANT: Be precise — only block clear gossip, not journalistic coverage
export const GOSSIP_WORDS = [
  "telenovela", "reality show", "gran hermano", "casa de los famosos", "survivor",
  "el bachelor", "amor a ciegas", "love is blind", "repechaje", "eliminado de la gala",
  "farándula", "espectáculos", "futbolista novia", "juego de azar",
  "chisme", "gossip", "novio de", "novia de", "boda de", "divorcio de",
  "influencer", "tiktok viral", "instagram viral",
  // sports celebrity gossip specifically
  "presentó a su novio", "presentó a su novia", "salió con", "rompió con"
];

// Non-journalistic content — these are TITLE patterns for lifestyle/advice/health clickbait
// Only check against the TITLE, not the body
export const NON_JOURNALISTIC_WORDS = [
  // advice/how-to
  "consejos para", "trucos para", "la técnica para", "por qué deberías",
  "guía para vivir", "lo que nadie te dice sobre", "evita estos errores",
  "cómo vivir más", "mejorar tu vida", "el secreto de vivir",
  // health/diet listicle headlines
  "cuál es la dieta", "qué alimentos", "los alimentos que", "qué comer",
  "cómo bajar de peso", "cómo adelgazar", "cómo tratar el", "cómo tratar la",
  "para qué sirve el", "para qué sirve la", "los beneficios de",
  "la dieta más eficaz", "el endulzante que", "el ingrediente que",
  "qué pasa si comés", "qué pasa si tomas", "qué pasa si tomás",
  // wellness/lifestyle generic
  "cómo dormir mejor", "cómo reducir el estrés", "el ejercicio que",
  "el hábito que", "los hábitos que", "cuántas horas"
];

// Clickbait title patterns (soft clickbait listicle headlines)
export const CLICKBAIT_TITLES = [
  "la gente que vive más", "estos son los hábitos",
  "no hace estos ejercicios", "descubre cómo vivir",
  "te sorprenderá saber", "cosas que no sabías"
];

// Palabras que indican "basura" - noticias sin contenido real (live blogs, minuto a minuto, coberturas)
export const JUNK_NEWS_PATTERNS = [
  "minuto a minuto", "al minuto", "en vivo", "en directo", "live blog", "live blogging",
  "últimas noticias", "últimas novedades", "últimas horas", "últimas actualizaciones",
  "seguí acá", "seguimos", "cobertura", "todo lo que pasa", "todo lo que sucede",
  "aquí van", "en este directo", "minuto tras minuto", "momento a momento",
  "actualización en vivo", "actualización por actualización", "se viene"
];

export const CATEGORIES = ["política", "economía", "sociedad", "tecnología", "cultura", "deporte", "internacional"];

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
