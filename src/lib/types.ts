// =============================================================================
// Collectra — Complete Type System
// The 20-year data architecture. Designed for any collectible, not just cards.
// =============================================================================

// ─── Universe Model ──────────────────────────────────────────────────────────

export type FranchiseCategory = 'games' | 'sports' | 'anime' | 'entertainment';

export interface Franchise {
  id: string;
  name: string;
  slug: string;
  category: FranchiseCategory;
  universeId?: string;
  logo?: string;
  color: string; // Brand color
  description?: string;
  cardCount: number;
  setCount: number;
}

export interface Era {
  id: string;
  franchiseId: string;
  name: string;
  slug: string;
  startYear: number;
  endYear?: number;
  description?: string;
  coverImage?: string;
}

export interface Release {
  id: string;
  eraId: string;
  franchiseId: string;
  name: string;
  slug: string;
  releaseDate: string; // ISO date
  coverImage: string;
  description?: string;
  totalCards: number;
  setIds: string[];
  productIds: string[];
}

export interface CardSet {
  id: string;
  releaseId: string;
  franchiseId: string;
  name: string;
  slug: string;
  language: string;
  totalCards: number;
  coverImage: string;
  releaseDate: string;
  subsets: Subset[];
  symbol?: string;
  setCode?: string;
}

export interface Subset {
  id: string;
  setId: string;
  name: string;
  rarity: Rarity;
  totalCards: number;
  color: string; // Rarity color
}

// ─── Card ────────────────────────────────────────────────────────────────────

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'holo-rare'
  | 'ultra-rare'
  | 'illustration-rare'
  | 'special-art-rare'
  | 'hyper-rare'
  | 'secret-rare'
  | 'promo';

export const RARITY_LABELS: Record<Rarity, string> = {
  'common': 'Common',
  'uncommon': 'Uncommon',
  'rare': 'Rare',
  'holo-rare': 'Holo Rare',
  'ultra-rare': 'Ultra Rare',
  'illustration-rare': 'Illustration Rare',
  'special-art-rare': 'Special Art Rare',
  'hyper-rare': 'Hyper Rare',
  'secret-rare': 'Secret Rare',
  'promo': 'Promo',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  'common': '#8B8B8B',
  'uncommon': '#4ADE80',
  'rare': '#60A5FA',
  'holo-rare': '#818CF8',
  'ultra-rare': '#C084FC',
  'illustration-rare': '#F472B6',
  'special-art-rare': '#FB923C',
  'hyper-rare': '#F43F5E',
  'secret-rare': '#FACC15',
  'promo': '#2DD4BF',
};

export type FoilType =
  | 'none'
  | 'holo'
  | 'reverse-holo'
  | 'cosmos'
  | 'mirror'
  | 'rainbow'
  | 'textured'
  | 'gold'
  | 'silver'
  | 'etched';

export type PromoType =
  | 'none'
  | 'prerelease'
  | 'league'
  | 'exclusive'
  | 'event'
  | 'mcdonalds'
  | 'costco'
  | 'pokemon-center'
  | 'build-a-bear'
  | 'staff';

export interface CardIdentity {
  name: string;
  number: string;          // e.g., "199/165"
  setId: string;
  subsetId?: string;
  franchiseId: string;
  releaseId: string;
  artist?: string;
  releaseDate: string;
  language: string;
  edition?: string;        // 1st edition, unlimited, etc.
  region?: string;
  copyright?: string;
}

export interface CardGameplay {
  type?: string;            // Fire, Water, etc.
  secondaryType?: string;
  hp?: number;
  stage?: string;           // Basic, Stage 1, Stage 2
  evolvesFrom?: string;
  attacks?: Attack[];
  ability?: { name: string; text: string };
  weakness?: { type: string; modifier: string };
  resistance?: { type: string; modifier: string };
  retreatCost?: number;
  rulesText?: string;
}

export interface Attack {
  name: string;
  cost: string[];           // Energy types
  damage: string;
  text?: string;
}

export interface CardCollectorInfo {
  rarity: Rarity;
  foilType: FoilType;
  promoType: PromoType;
  isStamped: boolean;
  isNumbered: boolean;      // /10, /25, etc.
  printRun?: number;        // For numbered cards
  isError: boolean;
  errorDescription?: string;
}

export interface PullOdds {
  perPack: string;         // "1/720" or "1:5"
  perBox?: string;
  perCase?: string;
  isGuaranteed: boolean;
}

export interface MarketData {
  currentPrice: number;    // In INR
  averagePrice: number;
  lowPrice: number;
  highPrice: number;
  thirtyDayChange: number; // Percentage
  ninetyDayChange: number;
  yearChange: number;
  lastSoldPrice?: number;
  lastSoldDate?: string;
  salesVolume: number;     // Monthly
  marketCap?: number;
}

export interface GradingPopulation {
  company: 'PSA' | 'BGS' | 'CGC' | 'TAG' | 'SGC';
  grades: { grade: string; count: number }[];
  totalPopulation: number;
  highestGrade: string;
}

export interface CardVariantRef {
  cardId: string;
  label: string;           // "Japanese", "Reverse Holo", "McDonald's", etc.
  language: string;
  foilType: FoilType;
  promoType: PromoType;
  image: string;
  price?: number;
}

export interface CardRelationships {
  characterCards: string[];      // IDs of all cards of this character
  artistCards: string[];         // IDs of all cards by this artist
  appearsInProducts: string[];   // Product IDs
  setSiblings: string[];         // Other cards in same set
  variants: CardVariantRef[];
}

export interface Card {
  id: string;
  identity: CardIdentity;
  gameplay: CardGameplay;
  collector: CardCollectorInfo;
  market: MarketData;
  pullOdds?: PullOdds;
  grading: GradingPopulation[];
  relationships: CardRelationships;
  images: {
    front: string;
    back?: string;
    highRes?: string;
  };
}

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductType =
  | 'booster-box'
  | 'etb'
  | 'booster-pack'
  | 'mini-tin'
  | 'tin'
  | 'upc'
  | 'collection-box'
  | 'poster-collection'
  | 'binder-collection'
  | 'starter-deck'
  | 'blister-pack'
  | 'mega-tin';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  'booster-box': 'Booster Box',
  'etb': 'Elite Trainer Box',
  'booster-pack': 'Booster Pack',
  'mini-tin': 'Mini Tin',
  'tin': 'Tin',
  'upc': 'Ultra Premium Collection',
  'collection-box': 'Collection Box',
  'poster-collection': 'Poster Collection',
  'binder-collection': 'Binder Collection',
  'starter-deck': 'Starter Deck',
  'blister-pack': 'Blister Pack',
  'mega-tin': 'Mega Tin',
};

export interface ProductContents {
  item: string;            // "Booster Pack", "Promo Card", etc.
  quantity: number;
  details?: string;
}

export interface PullRateEntry {
  rarity: Rarity;
  label: string;
  oddsPerPack: string;    // "5/10", "1/36", etc.
  oddsDecimal: number;    // 0.5, 0.0278, etc.
  expectedPerBox?: number;
}

export interface ChaseCard {
  cardId: string;
  name: string;
  image: string;
  odds: string;            // "1/720"
  value: number;           // Current market value in INR
}

export interface Product {
  id: string;
  releaseId: string;
  franchiseId: string;
  setId: string;
  name: string;
  slug: string;
  type: ProductType;
  image: string;
  releaseDate: string;
  msrp: number;
  marketPrice: number;
  contents: ProductContents[];
  pullRates: PullRateEntry[];
  chaseCards: ChaseCard[];
  packsPerBox?: number;
  cardsPerPack?: number;
  expectedValue?: number;  // Calculated EV per box
  description?: string;
}

// ─── Collection ──────────────────────────────────────────────────────────────

export type CardStatus =
  | 'wanted'
  | 'owned'
  | 'stored'
  | 'vaulted'
  | 'submitted'
  | 'graded'
  | 'trading'
  | 'listed'
  | 'sold';

export type CardCondition =
  | 'mint'
  | 'near-mint'
  | 'excellent'
  | 'good'
  | 'light-play'
  | 'played'
  | 'poor';

export const CONDITION_LABELS: Record<CardCondition, string> = {
  'mint': 'Mint',
  'near-mint': 'Near Mint',
  'excellent': 'Excellent',
  'good': 'Good',
  'light-play': 'Light Play',
  'played': 'Played',
  'poor': 'Poor',
};

export type AcquisitionSource =
  | 'pulled'
  | 'bought'
  | 'traded'
  | 'inherited'
  | 'gift'
  | 'won'
  | 'auction'
  | 'found'
  | 'other';

export interface Provenance {
  source: AcquisitionSource;
  date: string;
  price?: number;
  seller?: string;
  location?: string;
  notes?: string;
  photo?: string;
  receipt?: string;
}

export interface StorageLocation {
  room?: string;
  shelf?: string;
  binder?: string;
  page?: number;
  pocket?: number;
}

export interface GradeInfo {
  company: string;
  grade: number;
  certNumber?: string;
  submittedDate?: string;
  receivedDate?: string;
  gradedDate?: string;
  returnedDate?: string;
}

export interface CollectionEntry {
  cardId: string;
  collectionId: string;
  status: CardStatus;
  quantity: number;
  condition: CardCondition;
  isFavorite: boolean;
  provenance?: Provenance;
  storage?: StorageLocation;
  grade?: GradeInfo;
  dateAdded: string;
  notes?: string;
}

// ─── Collections (First-Class Objects) ───────────────────────────────────────

export type CollectionType =
  | 'standard'
  | 'investment'
  | 'exhibition'
  | 'child'
  | 'sale';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  type: CollectionType;
  setId: string;
  franchiseId: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

// ─── Event Sourcing ──────────────────────────────────────────────────────────

export type CollectionEventType =
  | 'ADDED'
  | 'REMOVED'
  | 'GRADED'
  | 'MOVED'
  | 'VAULTED'
  | 'TRADED'
  | 'LISTED'
  | 'SOLD'
  | 'PULLED'
  | 'FAVORITED'
  | 'UNFAVORITED'
  | 'CONDITION_CHANGED'
  | 'COLLECTION_CREATED'
  | 'COLLECTION_COMPLETED';

export interface CollectionEvent {
  id: string;
  type: CollectionEventType;
  timestamp: string;
  cardId?: string;
  collectionId?: string;
  data: Record<string, unknown>;
}

// ─── Tri-Layer Valuation ─────────────────────────────────────────────────────

export interface TriLayerValuation {
  rawValue: number;        // Current market value as-is
  gradedValue: number;     // Value if graded at expected grades
  potentialValue: number;  // Value if collection complete + fully graded
  rawChange: number;       // 30-day change percentage
}

// ─── Collector Score ─────────────────────────────────────────────────────────

export interface CollectorScoreBreakdown {
  overall: number;         // 0-100
  completeness: number;    // How many sets are completed
  condition: number;       // Average condition quality
  rarity: number;          // How many rare/ultra-rare cards
  variety: number;         // Cross-franchise diversity
  grades: number;          // Graded card percentage and quality
  dedication: number;      // Consistency of collecting activity
}

// ─── Collection DNA ──────────────────────────────────────────────────────────

export interface DNAEntry {
  franchiseId: string;
  franchiseName: string;
  percentage: number;
  color: string;
  cardCount: number;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectType = 'complete-set' | 'grade-vault' | 'build-character' | 'custom';

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  targetSetId?: string;
  targetCharacter?: string;
  progress: number;        // 0-100
  estimatedCost: number;   // INR
  estimatedEta?: string;   // "3 months"
  cardsNeeded: number;
  cardsAcquired: number;
  createdAt: string;
  isComplete: boolean;
}

// ─── Virtual Binder ──────────────────────────────────────────────────────────

export interface VirtualBinder {
  id: string;
  name: string;
  coverColor: string;
  gridCols: number;        // 2, 3, or 4
  gridRows: number;        // 2, 3, or 4
  pages: BinderPage[];
  createdAt: string;
}

export interface BinderPage {
  id: string;
  pageNumber: number;
  slots: (string | null)[]; // Card IDs or null for empty
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export interface WishlistEntry {
  cardId: string;
  addedAt: string;
  priceAlert?: number;     // Notify below this price in INR
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

// ─── Discover ────────────────────────────────────────────────────────────────

export interface DiscoverSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'cards' | 'sets' | 'products';
  items: string[];         // IDs
}

// ─── Intelligence I ──────────────────────────────────────────────────────────

export interface SmartSuggestion {
  id: string;
  type: 'complete-set' | 'sell-duplicate' | 'buy-product' | 'price-alert' | 'trade-opportunity';
  title: string;
  description: string;
  icon: string;
  actionLabel?: string;
  actionUrl?: string;
  priority: number;        // 1-10, higher = more relevant
}

// ─── Pack Simulator ──────────────────────────────────────────────────────────

export interface PackOpeningResult {
  id: string;
  productId: string;
  setId: string;
  timestamp: string;
  cards: PulledCard[];
}

export interface PulledCard {
  cardId: string;
  rarity: Rarity;
  isHit: boolean;          // Ultra Rare or better
}

export interface OpeningHistory {
  totalPacks: number;
  totalValue: number;
  totalSpent: number;
  roi: number;
  bestPull?: { cardId: string; value: number; odds: string };
  worstStreak: number;     // Packs without a hit
  averageLuck: number;     // % above/below expected
  rarityDistribution: { rarity: Rarity; count: number; expected: number }[];
}

// ─── Achievement ─────────────────────────────────────────────────────────────

export type AchievementCategory = 'first-steps' | 'milestones' | 'mastery' | 'dedication' | 'explorer';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;       // 0-100 for in-progress
  target?: number;
  current?: number;
}

// ─── Journey ─────────────────────────────────────────────────────────────────

export type JourneyMilestoneType =
  | 'first-pack'
  | 'first-complete'
  | 'first-grade'
  | 'card-milestone'
  | 'most-valuable'
  | 'acquisition'
  | 'sale'
  | 'custom';

export interface JourneyMilestone {
  id: string;
  type: JourneyMilestoneType;
  title: string;
  description?: string;
  date: string;
  year: number;
  cardId?: string;
  collectionId?: string;
  value?: number;
  image?: string;
  icon: string;
}

// ─── Price History ───────────────────────────────────────────────────────────

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}
