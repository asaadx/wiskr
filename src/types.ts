export type Kind = 'ok' | 'warn' | 'bad';

export interface Trademark {
  app: string;
  mark: string;
  owner: string;
  status: 'Registered' | 'Formalized' | 'Abandoned' | 'Searched';
  /** Nice classification: [class number, description] */
  classes: [number, string][];
  filed: string;
}

export interface TrademarkResult {
  items: Trademark[];
  /** Marks that are not abandoned */
  live: number;
}

export interface Domain {
  name: string;
  status: 'available' | 'taken' | 'premium';
  /** Registration price per year, CAD */
  price: number;
  /** Asking price when status is 'premium' */
  premium: number | null;
  /** Where an available domain can be registered; empty unless status is 'available' */
  registrars: RegistrarId[];
}

export type RegistrarId = 'cloudflare' | 'godaddy' | 'namecheap' | 'porkbun';

export type Platform = 'x' | 'instagram' | 'tiktok' | 'linkedin' | 'github' | 'youtube';

export interface Social {
  platform: Platform;
  label: string;
  url: string;
  status: 'available' | 'taken' | 'inactive';
  alt: string | null;
  meta: string;
}

export interface SearchHit {
  url: string;
  title: string;
  snip: string;
}

export interface OrganicHit extends SearchHit {
  /** False for filler results that aren't a competing brand */
  brand: boolean;
}

export interface GoogleResult {
  organic: OrganicHit[];
  sponsored: SearchHit | null;
  resultCount: number;
}

export interface Report {
  trademarks: TrademarkResult;
  domains: Domain[];
  socials: Social[];
  google: GoogleResult;
}

export interface FetchOptions {
  /** Skip simulated latency (used for reduced motion) */
  instant?: boolean;
}

export type NameStyle = 'latin' | 'everyday' | 'borrowed' | 'invented';

export interface Suggestion {
  name: string;
  /** One line on where the name comes from */
  origin: string;
}
