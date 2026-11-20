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
  links: string[];
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
