import type { SpecialtyItem } from "@/types/specialty";
import type { Locale } from "@/lib/locales";

interface Entry {
  ar: string;
  en: string;
  fr: string;
}

/** Specialty names by Arabic text (the name embedded after the code prefix); used to render the name in the current locale. */
const SPECIALTY_NAMES: Record<string, Entry> = {
  "كهرباء السيارات": { ar: "كهرباء السيارات", en: "Car Electrical", fr: "Électricité automobile" },
  "البستنة": { ar: "البستنة", en: "Gardening", fr: "Jardinage" },
  "تربية النحل": { ar: "تربية النحل", en: "Beekeeping", fr: "Api-culture" },
  "الانتاج الحيواني خيار تربية الحيوانات المجترة": { ar: "الانتاج الحيواني خيار تربية الحيوانات المجترة", en: "Livestock Production (Ruminants)", fr: "Production animale (ruminants)" },
  "إنشاء و تشغيل البستان": { ar: "إنشاء و تشغيل البستان", en: "Establishing and Operating the Orchard", fr: "Établir et exploiter le verger" },
  "زراعة الزعفران": { ar: "زراعة الزعفران", en: "Growing Saffron", fr: "Culture du safran" },
  "الحدادة الفنية": { ar: "الحدادة الفنية", en: "Artistic Smithing", fr: "Forge artistique" },
  "طلاء، حروف وزخرفة": { ar: "طلاء، حروف وزخرفة", en: "Painting, Letters and Decoration", fr: "Peinture, lettres et décorations" },
  "البناء": { ar: "البناء", en: "Construction", fr: "Construction" },
  "طلاء وتركيب الزجاج": { ar: "طلاء وتركيب الزجاج", en: "Painting and Glass Installation", fr: "Peinture et installation du verre" },
  "البلاط، الخزف والفسيفساء": { ar: "البلاط، الخزف والفسيفساء", en: "Tiling, Pottery and Mosaic", fr: "Carrelage, poterie et mosaïques" },
  "الطوبوغرافيا": { ar: "الطوبوغرافيا", en: "Bricklaying", fr: "Maçonnerie des briques" },
  "مُسيّر الأشغال العمومية": { ar: "مُسيّر الأشغال العمومية", en: "General Construction Supervisor", fr: "Superviseur des travaux publics" },
  "التركيب الصحي": { ar: "التركيب الصحي", en: "Sanitary Installation", fr: "Installations sanitaires" },
  "الكيمياء الصناعية": { ar: "الكيمياء الصناعية", en: "Industrial Chemistry", fr: "Chimie industrielle" },
  "تلحيم": { ar: "تلحيم", en: "Welding", fr: "Soudure" },
  "نجارة الألمنيوم والمواد البلاستيكية": { ar: "نجارة الألمنيوم والمواد البلاستيكية", en: "Aluminum Carpentry and Plastic Materials", fr: "Charronnerie en aluminum et matières plastiques" },
  "عامل الكهرباء المعماري": { ar: "عامل الكهرباء المعماري", en: "Architectural Electrician", fr: "Électricien de l'architecture" },
  "الكهرباء الصناعية": { ar: "الكهرباء الصناعية", en: "Industrial Electricity", fr: "Électricité industrielle" },
  "الكهرباء المعمارية": { ar: "الكهرباء المعمارية", en: "Architectural Electricity", fr: "Électricité de l'architecture" },
  "تركيب وصيانة أجهزة التبريد والتكييف": { ar: "تركيب وصيانة أجهزة التبريد والتكييف", en: "Installation and Maintenance of Refrigeration and Air Conditioning Devices", fr: "Installation et maintenance des appareils de réfrigération et de climatisation" },
  "الكهروميكانيكية": { ar: "الكهروميكانيكية", en: "Electro-Mechanics", fr: "Électromécanique" },
  "الصيانة الصناعية": { ar: "الصيانة الصناعية", en: "Industrial Maintenance", fr: "Maintenance industrielle" },
  "صناعة الحلويات": { ar: "صناعة الحلويات", en: "Confectionery Manufacturing", fr: "Fabrication de sucreries" },
  "الخبازة والفطائر": { ar: "الخبازة والفطائر", en: "Baking and Pastries", fr: "Boulangerie et pâtisserie" },
  "الإطعام خيار الطبخ الجماعي": { ar: "الإطعام خيار الطبخ الجماعي", en: "Catering — Group Cooking", fr: "Restauration collective" },
  "السياحة خيار وكالة الأسفار": { ar: "السياحة خيار وكالة الأسفار", en: "Tourism and Travel Agency", fr: "Tourisme et agence de voyage" },
  "مراقبة النوعية في الصناعات الغذائية": { ar: "مراقبة النوعية في الصناعات الغذائية", en: "Quality Control in Food Industries", fr: "Contrôle qualité dans les industries alimentaires" },
  "مُستغل المعلوماتية": { ar: "مُستغل المعلوماتية", en: "Informatics Specialist", fr: "Technicien en informatique" },
  "قاعدة المعطيات": { ar: "قاعدة المعطيات", en: "Databases", fr: "Bases de données" },
  "عامل في الميكرو معلوماتية": { ar: "عامل في الميكرو معلوماتية", en: "Micro-Informatics Technician", fr: "Technicien en micro-informatique" },
  "معالجة المياه": { ar: "معالجة المياه", en: "Water Treatment", fr: "Traitement de l'eau" },
  "قص و تجفيف الشعر": { ar: "قص و تجفيف الشعر", en: "Hair Cutting and Drying", fr: "Coupe et séchage du cheveu" },
  "حلاقة النساء": { ar: "حلاقة النساء", en: "Women's Haircut", fr: "Coupe pour femmes" },
  "حلاقة الرجال": { ar: "حلاقة الرجال", en: "Men's Haircut", fr: "Coupe pour hommes" },
  "ميكانيكي صيانة معدات الورشات ومعدات المناولة": { ar: "ميكانيكي صيانة معدات الورشات ومعدات المناولة", en: "Mechanic — Workshop and Industrial Equipment Maintenance", fr: "Mécanicien — maintenance des équipements de workshop" },
  "الإصلاح الميكانيكي للمركبات الخفيفة": { ar: "الإصلاح الميكانيكي للمركبات الخفيفة", en: "Mechanical Repair of Light Vehicles", fr: "Réparation mécanique des véhicules légers" },
  "أمين مخزن": { ar: "أمين مخزن", en: "Warehouse Stockkeeper", fr: "Responsable du stock" },
  "المحاسبة": { ar: "المحاسبة", en: "Accounting", fr: "Comptabilité" },
  "التأمينات": { ar: "التأمينات", en: "Insurance", fr: "Assurance" },
  "الأمانة": { ar: "الأمانة", en: "Office Reception", fr: "Accueil" },
  "محاسبة": { ar: "محاسبة", en: "Accounting", fr: "Comptabilité" },
  "أمين المحفوظات و الأرشيف": { ar: "أمين المحفوظات و الأرشيف", en: "Archives Custodian", fr: "Gestionnaire des archives" },
  "تجارة دولية": { ar: "تجارة دولية", en: "International Trade", fr: "Commerce international" },
  "أمانة المديرية": { ar: "أمانة المديرية", en: "Executive Office Staff", fr: "Secrétariat de direction" },
  "المحاسبة والتسيير": { ar: "المحاسبة والتسيير", en: "Accounting and Management", fr: "Comptabilité et gestion" },
  "تسيير الموارد البشرية": { ar: "تسيير الموارد البشرية", en: "Human Resource Management", fr: "Gestion des ressources humaines" },
  "الشراء والتموين": { ar: "الشراء والتموين", en: "Purchasing and Supply Management", fr: "Achats et Approvisionnement" },
  "تسيير المخزونات": { ar: "تسيير المخزونات", en: "Inventory Management", fr: "Gestion des stocks" },
  "تسيير المخزنات واللوجستيك": { ar: "تسيير المخزنات واللوجستيك", en: "Storage and Logistics Management", fr: "Gestion du stock et logistique" },
  "الإنجليزية التقنية للسمعي البصري": { ar: "الإنجليزية التقنية للسمعي البصري", en: "Technical English for the Deaf-Blind", fr: "Anglais Technique pour les Sourds et Aveugles" },
  "التصوير": { ar: "التصوير", en: "Photography", fr: "Photographie" },
  "الخياطة": { ar: "الخياطة", en: "Sewing", fr: "Couture" },
  "خياطة الألبسة الجاهزة": { ar: "خياطة الألبسة الجاهزة", en: "Sewing Ready-Made Garments", fr: "Couture de vêtements" },
};

/**
 * The specialty's Arabic name (the code's name part, e.g. "كهرباء السيارات").
 * Falls back to the catalog name when the code has no Arabic name part.
 */
export function specialtyName(item: Pick<SpecialtyItem, "code" | "name">, locale: Locale): string {
  const arName = item.code.split(/\s+/).slice(1).join(" ").trim() || item.name;
  const entry = SPECIALTY_NAMES[arName];
  if (locale === "en" && entry?.en) return entry.en;
  if (locale === "fr" && entry?.fr) return entry.fr;
  return arName;
}
