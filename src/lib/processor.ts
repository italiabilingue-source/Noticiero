import { FORBIDDEN_WORDS, GOSSIP_WORDS, CATEGORIES, type NewsItem } from './config';

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
// REGLAS GENERALES & CLASIFICACIÓN
// ---------------------------------------------------------
export function categorizeContent(title: string, summary: string, defaultCategory: string): string {
  const text = normalizeText(`${title} ${summary}`);

  // Contador de coincidencias para cada categoría
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

  // DEPORTE - palabras muy específicas
  if (text.match(/\b(futbol|futbolista|partido|gol|equipo deportivo|liga|campeonato|jugador|entrenador|tenis|basquet|voley|baloncesto|rugby|ciclismo|natacion|atletismo|boxeo|lucha libre|beisbol)\b/)) scores.deporte += 3;
  if (text.match(/\b(boca|river|independiente|san lorenzo|racing)\b/)) scores.deporte += 2;
  if (text.match(/\b(guardameta|portero|arquero|delantero|mediocampista|defensor)\b/)) scores.deporte += 2;
  if (text.match(/\b(mundial|copa del mundo|europeo|libertadores|super copa|torneo|campeon)\b/)) scores.deporte += 2;

  // GASTRONOMÍA - palabras muy específicas
  if (text.match(/\b(gastronomia|restaurante|chef|receta|cocina profesional|cocinero|menu|plato gourmet|michelin|buen comer)\b/)) scores.gastronomia += 3;
  if (text.includes("gastronomico")) scores.gastronomia += 2;

  // SALUD - palabras médicas específicas
  if (text.match(/\b(salud|medico|doctor|hospital|enfermedad|coronavirus|covid|vacuna|medicamento|virus|epidemia|pandemia)\b/)) scores.salud += 3;
  if (text.match(/\b(nutricion|dieta|ejercicio fisico|bienestar)\b/)) scores.salud += 2;

  // VIAJES Y TURISMO
  if (text.match(/\b(viajes|turismo|destino|hotel|resort|turistico|vacaciones|playa|montaña|aeropuerto)\b/)) scores.viajes += 3;
  if (text.includes("pasaje")) scores.viajes += 1;

  // MEDIOAMBIENTE - palabras muy específicas
  if (text.match(/\b(medioambiente|clima|calentamiento global|contaminacion|ecologia|cambio climatico)\b/)) scores.medioambiente += 3;
  if (text.match(/\b(lluvia|tormenta|bloqueo atmosferico|frente frio|niebla|granizo|nieve|sequia|inundacion|meteoro|fenomeno climatico)\b/)) scores.medioambiente += 2;
  if (text.match(/\b(temperatura|presion atmosferica|humedad|viento|sustentable|verde|bosque|ocean)\b/)) scores.medioambiente += 1;

  // POLÍTICA - muy específico
  if (text.match(/\b(politica|gobierno|presidente|elecciones|ministro|congreso|ley|diputado|senador|voto|electoral)\b/)) scores.politica += 3;
  if (text.match(/\b(guerra|conflicto|tratado|diplomacia|negociacion)\b/)) scores.politica += 2;
  if (text.match(/\b(iran|israel|palestina|ucrania|rusia|siria|gaza|occidente)\b/)) scores.politica += 2;

  // ECONOMÍA
  if (text.match(/\b(economia|dolar|inflacion|mercados|empresas|inversiones|fmi|banco central|bolsa|accion|mercado financiero|negocios)\b/)) scores.economia += 3;
  if (text.match(/\b(comercio|exportacion|importacion|arancel|impuesto|tributario)\b/)) scores.economia += 2;

  // SOCIEDAD Y EDUCACIÓN
  if (text.match(/\b(sociedad|educacion|escuela|universidad|estudiante|profesor|docente|academico|social|derechos|comunidad|igualdad|justicia)\b/)) scores.sociedad += 3;
  if (text.match(/\b(genero|feminismo|discriminacion|inclusion)\b/)) scores.sociedad += 2;

  // CULTURA - palabras muy específicas
  if (text.match(/\b(cultura|arte|cine|espectaculo|coreografo|director|actor|actriz|pelicula)\b/)) scores.cultura += 3;
  if (text.match(/\b(musica|concierto|orquesta|compositor|musico|sinfonica)\b/)) scores.cultura += 2;
  if (text.match(/\b(historia|teatro|literatura|pintura|escultura|galeria|museo|patrimonio)\b/)) scores.cultura += 2;

  // TECNOLOGÍA - palabras muy específicas (ÚLTIMO para no confundir)
  if (text.match(/\b(tecnologia|internet|ia|inteligencia artificial|software|hardware|computadora|codigo|programacion|algoritmo|iot|blockchain|crypto|metaverso)\b/)) scores.tecnologia += 3;
  if (text.match(/\b(apple|google|microsoft|meta|amazon|tesla|startup|app|smartphone|iphone)\b/)) scores.tecnologia += 2;
  if (text.match(/\b(espacio|nasa|satelite|astronauta|cohete|astronomia|universo|planeta)\b/)) scores.tecnologia += 2;

  // INTERNACIONAL - países y referencias globales
  if (text.match(/\b(internacional|global|mundial|paises|europa|america|asia|africa|oceania)\b/)) scores.internacional += 1;
  if (text.match(/\b(nuevo york|los angeles|londres|paris|tokio|sydney|mexico|colombia|brasil|peru|chile)\b/)) scores.internacional += 1;

  // Encontrar la categoría con mayor puntuación
  let maxScore = 0;
  let selectedCategory = defaultCategory;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedCategory = category;
    }
  }

  // Si no hay coincidencias con puntuación, usar default
  if (maxScore === 0) {
    return defaultCategory;
  }

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

  // 0. VALIDACIÓN MÍNIMA: Si no hay título o contenido es insuficiente, descartar
  if (!rawTitle || rawTitle.trim().length < 10) {
    return null; // DISCARD - Título muy corto
  }

  if (!rawContent || rawContent.trim().length < 30) {
    return null; // DISCARD - Sin suficiente contenido
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
  const cleanSummary = summarizeSnippet(declickbaitSummary);

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
