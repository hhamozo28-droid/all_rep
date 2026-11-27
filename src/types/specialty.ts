/** Archive.org mirror exposed in the "other links" tab. */
export interface SpecialtyOtherLink {
  name: string;
  folder: string;
  url: string;
}

export interface SpecialtyItem {
  id: string;
  idx: number;
  code: string;
  name: string;
  contentType: string | null;
  modules: number;
  lessons: number;
  filesCount: number;
  sizeMb: number;
  /** Opaque link descriptors; the real URL requires a one-attempt grant. */
  links: { index: number; name?: string }[];
  /** Sent only on the detail endpoint to keep the catalog payload small. */
  otherLinks?: SpecialtyOtherLink[];
  otherLinksCount?: number;
  version: number;
  publishedAt: string;
}

export interface CatalogResponse {
  items: SpecialtyItem[];
  version: number;
  publishedAt: string | null;
  updatedAt: number;
}

export { formatMb, formatDate } from "@/lib/client";
