import { FORBIDDEN_WORDS, GOSSIP_WORDS, JUNK_NEWS_PATTERNS, CATEGORIES, type NewsItem } from './config';

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

// Semantic/Contextual trigger phrases that imply violence/crime
const suspiciousPhrases = [
  "a los tiros", "ingreso a los tiros", "a punta de pistola",
  "abuso sexual", "ajuste de cuentas", "arma blanca", "arma de fuego",
  "ataque armado", "atentado", "bala", "balacera", "brutal golpiza",
  "cadaver", "cartel", "crimen", "delincuencia", "disparo",
  "doble homicidio", "femicidio", "fuego cruzado", "gatillo",
  "golpes", "herido de gravedad", "homicidio", "infarto", "lesiones",
  "mato", "matanza", "muerte", "muerto", "mutilado", "narcotrafico",
  "punalada", "robo", "sangre", "secuestro", "sicario", "terrorismo",
  "tragedia", "violencia", "violacion", "ataque", "macabro", "horror",
  "siniestro vial", "accidente fatal", "hallazgo", "hallaron cuerpo"
].map(normalizeText);

// Palabras que indican noticias genéricas/vacías sin contenido real
const genericPhrases = [
  "cobertura en tiempo real",
  "actualización en directo",
  "se actualizará",
  "últimas novedades",
  "información en desarrollo",
  "actualizaremos cuando",
  "más información próximamente",
  "sigue aquí para",
  "permanece atento",
  "en vivo",
  "live updates"
].map(normalizeText);

export function isContentAllowed(title: string, content: string): boolean {
  const combinedText = normalizeText(`${title} ${content}`);

  // Exact forbidden words (violence/crime)
  for (const word of forbiddenNormalized) {
    if (combinedText.includes(word)) return false;
  }

  // Gossip/Entertainment words (farándula)
  for (const word of gossipNormalized) {
    if (combinedText.includes(word)) return false;
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
export function categorizeContent(title: string, summary: string, defaultCategory: string): string {
  const text = normalizeText(`${title} ${summary}`);
  const titleText = normalizeText(title);

  // Sistema de scoring ponderado por categoría
  let scores = {
    deporte: 0,
    gastronomia: 0,
    salud: 0,
    viajes: 0,
    medioambiente: 0,
    politica: 0,
    economia: 0,
    sociedad: 0,
    cultura: 0,
    tecnologia: 0,
    internacional: 0
  };

  // ============ DEPORTE (MÁXIMA PRIORIDAD CUANDO SE DETECTA) ============
  // Palabras muy específicas de deporte
  const sportTerms = ["futbol", "futbolista", "partido", "gol", "equipo deportivo", "jugador",
    "entrenador", "tenis", "basquet", "voley", "baloncesto", "rugby", "ciclismo", "natacion",
    "atletismo", "boxeo", "beisbol", "campeonato", "liga", "torneo", "competencia", "campeon"];
  const sportTeams = ["boca", "river", "independiente", "san lorenzo", "racing", "estudiantes"];
  const sportPositions = ["guardameta", "portero", "arquero", "delantero", "mediocampista", "defensor", "lateral"];
  const sportEvents = ["mundial", "copa del mundo", "europeo", "libertadores", "super copa", "olimpiadas", "clasificatorios"];

  // Scoring deporte
  sportTerms.forEach(term => { if (text.includes(term)) scores.deporte += 5; });
  sportTeams.forEach(team => { if (text.includes(team)) scores.deporte += 8; });
  sportPositions.forEach(pos => { if (text.includes(pos)) scores.deporte += 4; });
  sportEvents.forEach(event => { if (text.includes(event)) scores.deporte += 7; });
  if (titleText.match(/vs\.?|vs|contra|championship|final/i)) scores.deporte += 3;

  // ============ POLÍTICA (ALTA PRIORIDAD) ============
  const politicaTerms = ["politica", "gobierno", "presidente", "elecciones", "ministro", "congreso",
    "ley", "diputado", "senador", "voto", "electoral", "reforma", "decreto", "parlamento", "senado",
    "poder judicial", "corte suprema", "justicia"];
  const conflictTerms = ["guerra", "conflicto", "tratado", "diplomacia", "negociacion", "acuerdo",
    "iran", "israel", "palestina", "ucrania", "rusia", "siria", "gaza", "occidente", "china"];

  politicaTerms.forEach(term => { if (text.includes(term)) scores.politica += 6; });
  conflictTerms.forEach(term => { if (text.includes(term)) scores.politica += 7; });

  // ============ ECONOMÍA ============
  const economiaTerms = ["economia", "dolar", "inflacion", "mercados", "empresas", "inversiones",
    "fmi", "banco central", "bolsa", "accion", "mercado financiero", "negocios", "comercio",
    "exportacion", "importacion", "arancel", "impuesto", "tributario", "pib", "desempleo", "superavit"];

  economiaTerms.forEach(term => { if (text.includes(term)) scores.economia += 6; });
  if (titleText.match(/dolar|inflacion|bolsa|mercado/i)) scores.economia += 4;

  // ============ TECNOLOGÍA (ESPECÍFICO) ============
  const techTerms = ["tecnologia", "software", "hardware", "computadora", "codigo", "programacion",
    "algoritmo", "iot", "blockchain", "crypto", "metaverso", "inteligencia artificial", "ia",
    "internet", "app", "smartphone", "iphone", "android", "startup", "github", "digital"];
  const techCompanies = ["apple", "google", "microsoft", "meta", "amazon", "tesla", "nvidia", "openai", "chatgpt"];
  const spaceTerms = ["espacio", "nasa", "satelite", "astronauta", "cohete", "astronomia", "universo", "planeta"];

  techTerms.forEach(term => { if (text.includes(term)) scores.tecnologia += 6; });
  techCompanies.forEach(term => { if (text.includes(term)) scores.tecnologia += 7; });
  spaceTerms.forEach(term => { if (text.includes(term)) scores.tecnologia += 6; });

  // ============ SALUD (MÉDICO Y ESPECÍFICO) ============
  const healthTerms = ["salud", "medico", "doctor", "hospital", "enfermedad", "coronavirus",
    "covid", "vacuna", "medicamento", "virus", "epidemia", "pandemia", "cancer", "diabetes",
    "nutricion", "dieta", "ejercicio fisico", "bienestar", "psicologia", "mental"];

  healthTerms.forEach(term => { if (text.includes(term)) scores.salud += 6; });
  if (titleText.match(/salud|medico|hospital/i)) scores.salud += 4;

  // ============ MEDIOAMBIENTE (CLIMA Y NATURALEZA) ============
  const envTerms = ["clima", "calentamiento global", "contaminacion", "ecologia", "cambio climatico",
    "sostenible", "verde", "bosque", "ocean", "lluvia", "tormenta", "niebla", "granizo", "nieve",
    "sequia", "inundacion", "meteoro", "fenomeno climatico", "temperatura", "humedad", "viento"];

  envTerms.forEach(term => { if (text.includes(term)) scores.medioambiente += 5; });
  if (titleText.match(/clima|lluvia|tormenta|bloqueo atmosferico/i)) scores.medioambiente += 4;

  // ============ VIAJES Y TURISMO ============
  const travelTerms = ["viajes", "turismo", "destino", "hotel", "resort", "turistico",
    "vacaciones", "playa", "montaña", "aeropuerto", "pasaje", "vuelo", "crucero"];

  travelTerms.forEach(term => { if (text.includes(term)) scores.viajes += 5; });

  // ============ GASTRONOMÍA (MUY ESPECÍFICA) ============
  const foodTerms = ["gastronomia", "restaurante", "chef", "receta", "cocina profesional",
    "cocinero", "menu", "plato gourmet", "michelin", "buen comer", "gastronomico"];

  foodTerms.forEach(term => { if (text.includes(term)) scores.gastronomia += 7; });

  // ============ CULTURA (ARTE Y ENTRETENIMIENTO) ============
  const cultureTerms = ["cultura", "arte", "cine", "pelicula", "museo", "galeria",
    "historia", "teatro", "literatura", "pintura", "escultura", "patrimonio"];
  const musicTerms = ["musica", "concierto", "orquesta", "compositor", "musico", "sinfonica", "banda", "cancion"];

  cultureTerms.forEach(term => { if (text.includes(term)) scores.cultura += 6; });
  musicTerms.forEach(term => { if (text.includes(term)) scores.cultura += 5; });

  // ============ SOCIEDAD Y EDUCACIÓN ============
  const societyTerms = ["educacion", "escuela", "universidad", "estudiante", "profesor",
    "docente", "academico", "derechos", "comunidad", "igualdad", "justicia", "genero",
    "feminismo", "discriminacion", "inclusion", "social"];

  societyTerms.forEach(term => { if (text.includes(term)) scores.sociedad += 5; });

  // ============ INTERNACIONAL (FALLBACK PARA NOTICIAS GLOBALES) ============
  const internationalCountries = ["estados unidos", "nueva york", "inglaterra", "francia", "españa",
    "italia", "alemania", "japan", "tokio", "beijing", "londees", "paris", "berlin", "mexico",
    "canada", "brasil", "australia", "nueva zelanda", "tailandia", "vietnam"];
  const globalTerms = ["internacional", "global", "mundial", "paises", "europa", "asia", "america",
    "africa", "oceania", "organizacion internacional", "naciones unidas", "onu", "union europea"];

  internationalCountries.forEach(term => { if (text.includes(term)) scores.internacional += 4; });
  globalTerms.forEach(term => { if (text.includes(term)) scores.internacional += 3; });

  // ============ SISTEMA DE PRIORIDADES ============
  // Cuando hay ambigüedad muy alta, descartar
  const maxScore = Math.max(...Object.values(scores));
  const scoresAboveThreshold = Object.values(scores).filter(s => s > 0).length;

  // Si no hay puntuación suficiente = usar default del feed
  if (maxScore === 0) {
    return defaultCategory || "internacional";
  }

  // Seleccionar ganador
  let selectedCategory = defaultCategory || "internacional";
  let maxScoreValue = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScoreValue) {
      maxScoreValue = score;
      selectedCategory = category;
    }
  }

  // NUNCA devolver vacío - siempre hay categoría válida
  return selectedCategory;
}

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
  const category = categorizeContent(cleanTitle, cleanSummary, feedCategory);

  // La categoría SIEMPRE es válida (nunca vacía), así que no hay que verificar

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
    if (feedInfo.id.includes("pol")) feedCategory = "política";
    if (feedInfo.id.includes("eco")) feedCategory = "economía";

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
