import { FORBIDDEN_WORDS, GOSSIP_WORDS, JUNK_NEWS_PATTERNS, CATEGORIES, NON_JOURNALISTIC_WORDS, CLICKBAIT_TITLES, type NewsItem } from './config';

function normalizeText(text: string): string {
  if (!text) return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------
// ANTI-CLICKBAIT & INSTITUTIONAL CLEANING
// ---------------------------------------------------------

// Palabras de clickbait que indican exageración sensacionalista
const clickbaitPatterns = [
  "no vás a creer", "no podras creer", "impactante", "sorprendente", "revelado", "secret",
  "confesó", "admitió", "choque", "caos", "desastre", "tragedia", "bomba", "escandaloso",
  "escándalo", "increíble", "insólito", "asombroso", "inaudito", "lo que nadie", "nunca",
  "jamás", "se viene", "viene fuerte", "fuerte", "brutal", "tremendo", "demoledor",
  "arrasó", "arrasa", "conquista", "conquisto", "ganadoras", "ganador", "viral", "trending"
].map(normalizeText);

// Patrones de reescritura neutra
const titlePatterns = [
  { pattern: /^.*?:\s*/i, replacement: '' }, // Remover "País: Noticia"
  { pattern: /\s*\[.*?\]\s*/g, replacement: ' ' }, // Remover [tags]
  { pattern: /\s*\(.*?actualizad.*?\)\s*/gi, replacement: ' ' }, // Remover "(actualizado)"
  { pattern: /\s+-\s+.{1,20}$/gi, replacement: '' }, // Remover sufijos pequeños
  { pattern: /\s*\|\s*.{1,30}$/g, replacement: '' }, // Remover "| Más noticias"
  { pattern: /\s{2,}/g, replacement: ' ' }, // Normalizar espacios
];

function removeClickbait(title: string, summary: string): { title: string; summary: string } {
  let cleanTitle = title;
  let cleanSummary = summary;

  const combinedText = normalizeText(`${title} ${summary}`);

  // Detectar si es clickbait
  const isClickbait = clickbaitPatterns.some(word => combinedText.includes(word));

  if (isClickbait) {
    // Remover patrones de clickbait del título
    cleanTitle = cleanTitle
      .replace(/no vas a creer/gi, '')
      .replace(/sorprendente:/gi, '')
      .replace(/impactante:/gi, '')
      .replace(/revelado:/gi, '')
      .replace(/se viene/gi, '')
      .replace(/\+/gi, 'y')
      .trim();
  }

  // Aplicar patrones de limpieza
  for (const { pattern, replacement } of titlePatterns) {
    cleanTitle = cleanTitle.replace(pattern, replacement);
  }

  // Limitar y normalizar
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

  // Si quedó muy corto, usar el original limpio
  if (cleanTitle.length < 10) {
    cleanTitle = title.replace(/\s+/g, ' ').trim();
  }

  return { title: cleanTitle, summary: cleanSummary };
}

function institutionalizeTitle(title: string): string {
  let clean = title;

  // Remover MAYÚSCULAS exageradas (más de 3 palabras seguidas)
  clean = clean.replace(/([A-Z]+\s+){3,}/g, (match) => {
    return match.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  });

  // Convertir a formato más neutro: Capital case
  clean = clean.split(' ').map((word, idx) => {
    if (idx === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (word.length <= 2) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');

  // Remover "dice que", "según", "asegura" excesivos
  clean = clean.replace(/^(dice que|según|asegura|afirma)\s+/i, '');

  return clean;
}

// ---------------------------------------------------------
// 1 & 2. FILTRADO Y DETECCIÓN SENSIBLE
// ---------------------------------------------------------
const forbiddenNormalized = FORBIDDEN_WORDS.map(normalizeText);
const gossipNormalized = GOSSIP_WORDS.map(normalizeText);
const nonJournalisticNormalized = NON_JOURNALISTIC_WORDS.map(normalizeText);
const clickbaitTitlesNormalized = CLICKBAIT_TITLES.map(normalizeText);

// Semantic/Contextual trigger phrases that imply violence/organized crime ONLY
const suspiciousPhrases = [
  "a los tiros", "ingreso a los tiros", "a punta de pistola",
  "ajuste de cuentas", "balacera", "cartel", "sicario",
  "narcotrafico", "trata de personas", "mafia", "banda criminal",
  "secuestro", "terrorismo", "atentado terrorista"
].map(normalizeText);

// Palabras que indican noticias genéricas/vacías sin contenido real
const genericPhrases = [
  "cobertura en tiempo real",
  "actualización en directo",
  "se actualizará",
  "información en desarrollo",
  "actualizaremos cuando",
  "más información próximamente",
  "sigue aquí para",
  "permanece atento"
].map(normalizeText);

export function isContentAllowed(title: string, content: string): boolean {
  const combinedText = normalizeText(`${title} ${content}`);
  const titleText = normalizeText(title);

  // Exact forbidden words (violence/crime)
  for (const word of forbiddenNormalized) {
    if (combinedText.includes(word)) return false;
  }

  // Gossip/Entertainment words (farándula)
  for (const word of gossipNormalized) {
    if (combinedText.includes(word)) return false;
  }

  // Non-journalistic content (advice, wellness, lifestyle, etc.)
  for (const word of nonJournalisticNormalized) {
    if (combinedText.includes(word)) return false;
  }

  // Soft clickbait titles
  for (const pattern of clickbaitTitlesNormalized) {
    if (titleText.includes(pattern)) return false;
  }

  // Check if title is too generic / looks like a blog post
  if (titleText.startsWith("por que ") || titleText.startsWith("como ") || 
      titleText.includes("los mejores ") || titleText.includes("consejos para")) {
    return false;
  }

  // Suspicious phrases (Semantic detection baseline)
  for (const phrase of suspiciousPhrases) {
    if (combinedText.includes(phrase)) return false;
  }

  // Generic/empty news phrases (no real content)
  for (const phrase of genericPhrases) {
    if (combinedText.includes(phrase)) return false;
  }

  return true; // No violence, gossip, or empty content detected
}

// ---------------------------------------------------------
// 3 & 4. RESUMEN AUTOMÁTICO Y LIMPIEZA DE TEXTO
// ---------------------------------------------------------
function cleanText(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // Remove HTML tags completely
  cleaned = cleaned.replace(/<[^>]*>?/gm, '');
  
  // Remove extreme sensationalism
  cleaned = cleaned.replace(/¡URGENTE!/gi, "");
  cleaned = cleaned.replace(/¡ÚLTIMO MOMENTO!/gi, "");
  cleaned = cleaned.replace(/ÚLTIMA HORA:/gi, "");
  cleaned = cleaned.replace(/ALERTA:/gi, "");
  cleaned = cleaned.replace(/EN VIVO:/gi, "");
  cleaned = cleaned.replace(/EXCLUSIVO:/gi, "");

  // Remove trailing whitespace and extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove sensationalist quotes that often start titles/snippets
  // e.g., "Todo fue un desastre", afirmó...
  cleaned = cleaned.replace(/^".*?"/g, "").trim();

  return cleaned;
}

function summarizeSnippet(snippet: string): string {
  const cleaned = cleanText(snippet);
  
  // Max ~150 chars, max 2-3 lines equivalent for TV reading comfort
  const MAX_LENGTH = 150;
  
  if (cleaned.length <= MAX_LENGTH) return cleaned;
  
  // Try to cut at the nearest full stop within MAX_LENGTH
  const cutIndex = cleaned.lastIndexOf('.', MAX_LENGTH);
  if (cutIndex > 50) {
    return cleaned.substring(0, cutIndex + 1);
  }
  
  // If no good full stop, cut roughly at words
  const textCut = cleaned.substring(0, MAX_LENGTH);
  const lastSpace = textCut.lastIndexOf(' ');
  return textCut.substring(0, lastSpace) + '...';
}

// ---------------------------------------------------------
// 5. NORMALIZACIÓN DE TÍTULO
// ---------------------------------------------------------
function normalizeTitle(title: string): string {
  const cleaned = cleanText(title);
  const words = cleaned.split(' ');
  
  // Limit to max 12-15 words
  if (words.length > 15) {
    return words.slice(0, 15).join(' ') + '...';
  }
  return cleaned;
}

// ---------------------------------------------------------
// 6. DECISIÓN DE VISUALIZACIÓN
// ---------------------------------------------------------
function getDisplayMode(summaryLength: number): 'short' | 'medium' | 'long' {
  if (summaryLength < 60) return 'short';
  if (summaryLength <= 100) return 'medium';
  return 'long'; // If long, in TV mode we'll strictly hide scrollbars
}

// ---------------------------------------------------------
// JUNK NEWS DETECTION - Filtra "minuto a minuto", live blogs, coberturas
// ---------------------------------------------------------
const junkNormalized = JUNK_NEWS_PATTERNS.map(normalizeText);

function isJunkNews(title: string, summary: string): boolean {
  const combined = normalizeText(`${title} ${summary}`);

  // Solo eliminar si es CLARAMENTE minuto a minuto O similar
  // Y el contenido está vacío de información
  const isJunk = junkNormalized.some(pattern => combined.includes(pattern));

  if (isJunk) {
    // Pero si tiene contenido sustantivo real, NO eliminar
    // Chequeamos si hay al menos algo de contexto
    const wordCount = summary.split(/\s+/).length;
    if (wordCount < 15) {
      return true; // Sí, es basura + muy corto = descartar
    }
  }

  return false;
}

// ---------------------------------------------------------
// SUBSTANTIVE CONTENT CHECK - Valida si es REALMENTE vacío
// ---------------------------------------------------------
function hasSubstantiveContent(title: string, summary: string): boolean {
  const combined = `${title} ${summary}`;

  // Solo rechaza si es TOTALMENTE vacío
  const reallyEmpty = [
    /^[\s\-\.\,"']*$/, // solo caracteres vacíos
    /^\W{1,5}$/, // solo 1-5 caracteres especiales
  ];

  return !reallyEmpty.some(p => p.test(combined.trim()));
}

// ---------------------------------------------------------
// CATEGORIZACIÓN Y CLASIFICACIÓN
// ---------------------------------------------------------
export function categorizeContent(title: string, summary: string, feedCategory?: string): string | null {
  const text = normalizeText(`${title} ${summary}`);
  
  // Scoring system
  let scores: Record<string, number> = {
    deporte: 0,
    politica: 0,
    economia: 0,
    sociedad: 0,
    cultura: 0,
    tecnologia: 0,
    internacional: 0
  };

  // Give boost to feed category if it exists and is valid
  if (feedCategory && scores.hasOwnProperty(feedCategory.toLowerCase())) {
    scores[feedCategory.toLowerCase()] += 3;
  }

  // ============ DEPORTE ============
  const sportTerms = ["futbol", "futbolista", "partido", "gol", "equipo", "jugador",
    "entrenador", "tenis", "basquet", "voley", "rugby", "ciclismo"];
  const sportTeams = ["boca", "river", "independiente", "racing"];
  const sportEvents = ["mundial", "copa del mundo", "libertadores", "olimpiadas"];

  sportTerms.forEach(term => { if (text.includes(term)) scores.deporte += 5; });
  sportTeams.forEach(team => { if (text.includes(team)) scores.deporte += 8; });
  sportEvents.forEach(event => { if (text.includes(event)) scores.deporte += 7; });

  // ============ POLÍTICA ============
  const politicaTerms = ["politica", "gobierno", "presidente", "elecciones", "ministro", "congreso", "ley", "diputados", "senadores", "presupuesto"];
  const conflictTerms = ["guerra", "conflicto", "iran", "israel", "ucrania", "rusia"];

  politicaTerms.forEach(term => { if (text.includes(term)) scores.politica += 6; });
  conflictTerms.forEach(term => { if (text.includes(term)) scores.politica += 7; });

  // ============ ECONOMÍA ============
  const economiaTerms = ["economia", "dolar", "inflacion", "mercado", "bolsa", "fmi", "banco central", "deficit", "pbi", "exportacion", "importacion", "ahorro"];
  economiaTerms.forEach(term => { if (text.includes(term)) scores.economia += 6; });

  // ============ TECNOLOGÍA ============
  const techTerms = ["tecnologia", "software", "ia", "inteligencia artificial", "app", "digital", "gadget", "ciberseguridad", "redes sociales"];
  const techCompanies = ["apple", "google", "microsoft", "nasa", "openai"];

  techTerms.forEach(term => { if (text.includes(term)) scores.tecnologia += 6; });
  techCompanies.forEach(term => { if (text.includes(term)) scores.tecnologia += 7; });

  // ============ CULTURA ============
  const cultureTerms = ["cultura", "arte", "cine", "pelicula", "museo", "teatro", "literatura", "exposicion"];
  cultureTerms.forEach(term => { if (text.includes(term)) scores.cultura += 6; });

  // ============ SOCIEDAD ============
  const societyTerms = ["educacion", "escuela", "universidad", "derechos", "comunidad", "protesta", "marcha", "transito", "clima"];
  societyTerms.forEach(term => { if (text.includes(term)) scores.sociedad += 5; });

  // ============ INTERNACIONAL ============
  const internationalCountries = ["estados unidos", "nueva york", "inglaterra", "francia", "españa",
    "italia", "alemania", "tokio", "beijing", "londres", "paris", "mexico", "brasil"];
  const globalTerms = ["internacional", "global", "mundial", "europa", "asia", "naciones unidas"];

  internationalCountries.forEach(term => { if (text.includes(term)) scores.internacional += 4; });
  globalTerms.forEach(term => { if (text.includes(term)) scores.internacional += 3; });

  // ============ DECISION ============
  let selectedCategory: string | null = null;
  let maxScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedCategory = category;
    }
  }

  // Change: If score is too low or no category found, return null (DO NOT SHOW)
  if (maxScore < 4) return null;

  return selectedCategory;
}

// ---------------------------------------------------------
// EXTRACCIÓN DE IMAGEN
// ---------------------------------------------------------
export function extractImageUrl(item: any): string | undefined {
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) return item.mediaContent.$.url;
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  
  const content = item.content || item.contentSnippet || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) return imgMatch[1];
  
  return undefined;
}

// ---------------------------------------------------------
// 7. PIPELINE PRINCIPAL
// ---------------------------------------------------------
function processNews(item: any, feedCategory: string, feedInfo: any): NewsItem | null {
  const rawTitle = item.title || '';
  const rawContent = item.contentSnippet || item.content || '';

  // 0. VALIDACIÓN MÍNIMA: Si no hay NADA, descartar (relajado)
  if (!rawTitle || !rawTitle.trim()) {
    return null; // DISCARD - Sin título
  }

  if (!rawContent || !rawContent.trim()) {
    return null; // DISCARD - Sin contenido
  }

  // NUEVO: Detected junk news (minuto a minuto, en vivo, coberturas, etc)
  if (isJunkNews(rawTitle, rawContent)) {
    return null; // DISCARD - Basura (live blog, minuto a minuto, cobertura)
  }

  // NUEVO: Verificar que tenga contenido sustantivo (no solo estructura vacía)
  if (!hasSubstantiveContent(rawTitle, rawContent)) {
    return null; // DISCARD - Sin contenido real/sustantivo
  }

  // NUEVO: Remover clickbait y reescribir
  const { title: declickbaitTitle, summary: declickbaitSummary } = removeClickbait(rawTitle, rawContent);

  // NUEVO: Institucionalizar el título
  const institutionalTitle = institutionalizeTitle(declickbaitTitle);

  // 1 & 2: Validar si es seguro
  if (!isContentAllowed(institutionalTitle, declickbaitSummary)) {
    return null; // DISCARD - Violencia detectada o dudoso
  }

  // 4 & 5: Título limpio y normalizado
  const cleanTitle = normalizeTitle(institutionalTitle);

  // 3 & 4: Resumen automático neutral y limpio
  let cleanSummary = summarizeSnippet(declickbaitSummary);

  // Si quedó muy corto, intentar reconstruir desde el título limpio
  if (cleanSummary.length < 20 && cleanTitle.length > 5) {
    cleanSummary = cleanTitle + ". " + declickbaitSummary.substring(0, 100);
  }

  // NO descartar si resumen es corto - siempre hay algo
  if (!cleanSummary.trim()) {
    cleanSummary = cleanTitle; // Fallback al título
  }

  // 6: Decisión visual
  const mode = getDisplayMode(cleanSummary.length);

  // Categoría final e imagen
  // Usar categoría del feed como apoyo
  const category = categorizeContent(cleanTitle, cleanSummary, feedCategory);

  // SI no tiene categoría válida, DESCARTAR
  if (!category) {
    return null; // DISCARD - No se pudo categorizar correctamente o score bajo
  }

  const imageUrl = extractImageUrl(item);

  // Fallback IDs robustness
  const uniqueId = Array.isArray(item.guid) ? item.guid[0] : (item.guid || item.id || item.link || Math.random().toString(36).substring(7));

  return {
    id: uniqueId as string,
    title: cleanTitle,
    link: item.link || '',
    pubDate: item.pubDate || new Date().toISOString(),
    summary: cleanSummary,
    contentSnippet: rawContent, // For potential future debugging
    source: feedInfo.name,
    country: feedInfo.country,
    category: category,
    imageUrl: imageUrl,
    isFeatured: false,
    displayMode: mode
  };
}

export function processNewsData(feedsData: any[]): NewsItem[] {
  let allNews: NewsItem[] = [];

  for (const { feedInfo, data } of feedsData) {
    let feedCategory = "internacional";
    if (feedInfo.id.toLowerCase().includes("politica")) feedCategory = "política";
    if (feedInfo.id.toLowerCase().includes("economia")) feedCategory = "economía";
    if (feedInfo.id.toLowerCase().includes("sociedad")) feedCategory = "sociedad";
    if (feedInfo.id.toLowerCase().includes("tecnologia")) feedCategory = "tecnología";
    if (feedInfo.id.toLowerCase().includes("deporte")) feedCategory = "deporte";
    if (feedInfo.id.toLowerCase().includes("cultura")) feedCategory = "cultura";

    const items = data.items || [];
    
    for (const item of items) {
      const processedItem = processNews(item, feedCategory, feedInfo);
      
      // Filter out rejected items
      if (processedItem) {
        allNews.push(processedItem);
      }
    }
  }

  // Sort by date descending
  allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Mark top 3 as featured
  for (let i = 0; i < Math.min(3, allNews.length); i++) {
    allNews[i].isFeatured = true;
  }

  return allNews;
}
