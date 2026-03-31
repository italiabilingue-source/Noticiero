import { FORBIDDEN_WORDS, GOSSIP_WORDS, CATEGORIES, type NewsItem } from './config';

function normalizeText(text: string): string {
  if (!text) return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
// REGLAS GENERALES & CLASIFICACIÓN
// ---------------------------------------------------------
export function categorizeContent(title: string, summary: string, defaultCategory: string): string {
  const text = normalizeText(`${title} ${summary}`);

  // Categorías en orden de especificidad (más específicas primero)

  // DEPORTE (detectar primero para evitar confusiones)
  if (text.includes("futbol") || text.includes("futbolista") || text.includes("partido") || text.includes("gol") || text.includes("equipo") || text.includes("liga") || text.includes("campeonato") || text.includes("jugador") || text.includes("entrenador") || text.includes("tenis") || text.includes("basquet") || text.includes("voley") || text.includes("baloncesto") || text.includes("rugby") || text.includes("ciclismo") || text.includes("natacion") || text.includes("atletismo") || text.includes("boxeo") || text.includes("lucha libre") || text.includes("beisbol") || text.includes("boca") || text.includes("river") || text.includes("independiente") || text.includes("san lorenzo") || text.includes("racing") || text.includes("guardameta") || text.includes("portero") || text.includes("arquero") || text.includes("mundial") || text.includes("copa del mundo") || text.includes("europeo") || text.includes("libertadores") || text.includes("super copa") || text.includes("defensor") || text.includes("delantero") || text.includes("mediocampista")) return "deporte";

  // GASTRONOMÍA
  if (text.includes("gastronomia") || text.includes("restaurante") || text.includes("chef") || text.includes("receta") || text.includes("cocina") || text.includes("comida") || text.includes("plato") || text.includes("cocinero") || text.includes("buen comer") || text.includes("gastronomico") || text.includes("menu") || text.includes("comedor")) return "gastronomía";

  // SALUD
  if (text.includes("salud") || text.includes("medico") || text.includes("doctor") || text.includes("hospital") || text.includes("enfermedad") || text.includes("coronavirus") || text.includes("covid") || text.includes("vacuna") || text.includes("medicamento") || text.includes("ejercicio") || text.includes("nutricion") || text.includes("dieta")) return "salud";

  // VIAJES
  if (text.includes("viajes") || text.includes("turismo") || text.includes("destino") || text.includes("hotel") || text.includes("turistico") || text.includes("vacaciones") || text.includes("playa") || text.includes("montaña") || text.includes("aeropuerto") || text.includes("pasaje")) return "viajes";

  // MEDIOAMBIENTE
  if (text.includes("medioambiente") || text.includes("clima") || text.includes("calentamiento global") || text.includes("contaminacion") || text.includes("ecologia") || text.includes("naturaleza") || text.includes("bosque") || text.includes("ocean") || text.includes("sostenible") || text.includes("verde")) return "medioambiente";

  if (text.includes("politica") || text.includes("gobierno") || text.includes("presidente") || text.includes("elecciones") || text.includes("ministro") || text.includes("congreso") || text.includes("ley") || text.includes("diputado") || text.includes("senador") || text.includes("guerra") || text.includes("conflicto") || text.includes("iran") || text.includes("israel") || text.includes("palestina") || text.includes("ucrania") || text.includes("rusia")) return "política";

  if (text.includes("dolar") || text.includes("inflacion") || text.includes("mercados") || text.includes("economia") || text.includes("empresas") || text.includes("inversiones") || text.includes("fmi") || text.includes("banco central") || text.includes("bolsa")) return "economía";

  if (text.includes("sociedad") || text.includes("educacion") || text.includes("escuela") || text.includes("universidad") || text.includes("estudiante") || text.includes("profesor") || text.includes("social") || text.includes("derechos") || text.includes("comunidad")) return "sociedad";

  if (text.includes("tecnologia") || text.includes("internet") || text.includes("ia") || text.includes("software") || text.includes("apple") || text.includes("google") || text.includes("inteligencia artificial") || text.includes("espacio") || text.includes("nasa") || text.includes("computadora") || text.includes("codigo") || text.includes("programacion")) return "tecnología";

  if (text.includes("cultura") || text.includes("arte") || text.includes("cine") || text.includes("musica") || text.includes("historia") || text.includes("teatro") || text.includes("literatura") || text.includes("pintura") || text.includes("escultura")) return "cultura";

  return defaultCategory;
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

  // 0. VALIDACIÓN MÍNIMA: Si no hay título o contenido es insuficiente, descartar
  if (!rawTitle || rawTitle.trim().length < 10) {
    return null; // DISCARD - Título muy corto
  }

  if (!rawContent || rawContent.trim().length < 30) {
    return null; // DISCARD - Sin suficiente contenido
  }

  // 1 & 2: Validar si es seguro
  if (!isContentAllowed(rawTitle, rawContent)) {
    return null; // DISCARD - Violencia detectada o dudoso
  }

  // 4 & 5: Título limpio y normalizado
  const cleanTitle = normalizeTitle(rawTitle);

  // 3 & 4: Resumen automático neutral y limpio
  const cleanSummary = summarizeSnippet(rawContent);

  // Si el resumen resultó muy corto después de limpieza, descartar
  if (cleanSummary.length < 30) {
    return null; // DISCARD - Resumen insuficiente después de limpieza
  }

  // 6: Decisión visual
  const mode = getDisplayMode(cleanSummary.length);

  // Categoría final e imagen
  const category = categorizeContent(cleanTitle, cleanSummary, feedCategory);
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
