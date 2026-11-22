"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCALES, isLocale, type Locale } from "./locales";

export { LOCALES, isLocale, type Locale };

const ar: Record<string, string> = {
  appName: "منصة دروسي",
  appTagline: "مكتبة التخصصات وروابط التحميل عند الطلب",
  home: "الرئيسية",
  search: "بحث",
  searchPlaceholder: "أدخل رمز التخصص للبحث مثلا : MES 0701",
  specialties: "التخصصات",
  noResults: "لا توجد نتائج مطابقة لبحثك",
  emptyTitle: "لا توجد تخصصات بعد",
  emptyBody:
    "القائمة فارغة حاليًا. يُضيف المسؤول المحتوى عبر رفع ملف Word من لوحة الإدارة.",
  modules: "وحدات",
  lessons: "دروس",
  files: "ملفات",
  size: "الحجم",
  type: "النوع",
  code: "الرمز",
  name: "الاسم",
  version: "إصدار",
  published: "آخر نشر",
  never: "لا يوجد بعد",
  items: "عناصر",
  download: "تحميل",
  back: "رجوع",
  detail: "التفاصيل",
  linksTitle: "روابط التحميل",
  openHint: "يفتح رابط gofile في تبويب جديد — يتم التحميل عند الطلب.",
  downloadLimitMessage: "التحميل محدود من المسؤول",
  copy: "نسخ",
  copied: "تم النسخ",
  login: "تسجيل الدخول",
  register: "إنشاء حساب",
  logout: "تسجيل الخروج",
  account: "الحساب",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  loginTitle: "أهلا بك ، أتمنى أن تجد ماتريد",
  loginBody:
    "سجّل الدخول لعرض التخصصات وروابط التحميل. يُسمح بجلسة واحدة  لكل حساب. إذا لم تجد ملفاتك يمكنك التواصل معنا لتوفيرها على صفحتكم دروسي .",
  registerTitle: "حساب جديد",
  registerBody: "أنشئ حسابك بالبريد وكلمة المرور للوصول إلى مكتبة التخصصات.",
  noAccount: "ليس لديك حساب؟",
  haveAccount: "لديك حساب بالفعل؟",
  kicked:
    "تم تسجيل الدخول بحسابك من جهاز آخر، لذا أُنهيت الجلسة على هذا الجهاز.",
  wrongCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  emailExists: "هذا البريد الإلكتروني مسجّل مسبقًا",
  emailNotReal: "البريد الإلكتروني غير صحيح أو غير موجود",
  invalidEmail: "أدخل بريدًا إلكترونيًا صالحًا",
  passwordMin: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  sessionLost: "انتهت جلستك",
  sessionLostBody: "سجّل الدخول مرة أخرى للمتابعة إلى مكتبة التخصصات.",
  goToLogin: "الذهاب إلى تسجيل الدخول",
  adminTitle: "لوحة الإدارة",
  adminSignInHelp: "أدخل كلمة مرور المسؤول. لا يلزم تسجيل الدخول بحساب مستخدم.",
  adminCookieBlocked: "قُبلت كلمة المرور، لكن المتصفح لم يحفظ جلسة الإدارة. افتح اللوحة في تبويب مستقل ثم سجّل الدخول.",
  openAdminTab: "فتح اللوحة في تبويب مستقل",
  adminSessionExpired: "انتهت جلسة الإدارة. أدخل كلمة مرور المسؤول للمتابعة.",
  adminCatalogUnavailable: "تعذّر تحميل ملخص القائمة. جلستك ما زالت مفتوحة.",
  adminPublishUnavailable: "تعذّر حفظ القائمة. لم يُنشر الملف؛ يمكنك إعادة المحاولة.",
  adminNotConfigured: "دخول الإدارة غير مهيّأ. يجب ضبط ADMIN_PASSWORD في إعدادات الخادم.",
  adminBody: "ارفع ملف Word (جدول 7 أعمدة) لتحديث قائمة التخصصات لجميع المستخدمين.",
  adminPassword: "كلمة مرور المسؤول",
  unlock: "فتح اللوحة",
  wrongPassword: "كلمة المرور غير صحيحة",
  adminHint: "وضع تجريبي: كلمة المرور الافتراضية هي admin123",
  uploadFile: "رفع ملف Word (.docx)",
  dragOrBrowse: "اسحب الملف هنا أو اضغط للاختيار",
  upload: "رفع ونشر",
  uploading: "جارٍ المعالجة…",
  uploadHint:
    "الأعمدة السبعة: الرقم، الرمز، الاسم، النوع، الوحدات، الدروس، الروابط (روابط gofile داخل الخلية الأخيرة).",
  currentCatalog: "القائمة الحالية",
  lastUpload: "آخر رفع",
  loadDemo: "تحميل بيانات تجريبية",
  clearAll: "إفراغ القائمة",
  confirmClear: "هل أنت متأكد من حذف جميع التخصصات؟ لا يمكن التراجع.",
  uploadedOk: "تم نشر {n} تخصصًا — الإصدار {v}",
  uploadedWarn: "تم النشر مع تنبيهات (راجع الأسفل)",
  fileTooBig: "حجم الملف كبير — الحد الأقصى 15 م.ب",
  badFile: "الملف يجب أن يكون بصيغة .docx",
  error: "حدث خطأ غير متوقع",
  retry: "إعادة المحاولة",
  loading: "جارٍ التحميل…",
  offlineNote: "عرض من النسخة المحفوظة (أنت غير متصل)",
  install: "تثبيت التطبيق",
  language: "اللغة",
  pageNotFound: "الصفحة غير موجودة",
  pageNotFoundBody: "الصفحة التي تبحث عنها غير موجودة أو تم حذفها.",
  browse: "اختيار ملف",
  noTable: "لم يتم العثور على جدول داخل الملف",
  noRows: "لا توجد صفوف صالحة — تأكد من 7 أعمدة وأن عمود الرمز غير فارغ",
  unreadable: "تعذرت قراءة الملف — هل هو ملف .docx صالح؟",
  warnNoCode: "صف بدون رمز — تم تجاوزه",
  warnCols: "{n} أعمدة بدل 7",
  linkSheets: "مخططات الدروس",
  linkNotes: "مذكرات الدروس",
  footerByline: "حقوق التصميم و النشر والمشاركة للأستاذ حمزة شعيب",
  uploadSuccess: "تم الرفع بنجاح",
  welcomeMessage: "مرحبا بك زميلي الأستاذ ، أتمنى أن تجد ماتريد",
  idleLoggedOut: "تم تسجيل الخروج التلقائي بعد 10 دقائق من عدم التفاعل",
  blocked: "الحساب محجوب",
  allSectors: "الكل",
  sectorFilter: "الشعبة المهنية",
  adminAccounts: "الحسابات",
  adminTablePassword: "كلمة السر",
  adminTableDownloads: "عدد التحميلات",
  adminTableActions: "الإجراءات",
  adminLimit: "حد التحميلات",
  adminLimitUnlimited: "غير محدود",
  adminLimit3: "3 تحميلات",
  adminLimit10: "10 تحميلات",
  adminLimit20: "20 تحميلا",
  adminLimit50: "50 تحميلا",
  adminLimit150: "150 تحميلا",
  adminBlock: "حظر",
  adminUnblock: "إلغاء الحظر",
  adminAddAccount: "إضافة حساب",
  adminAccountAdded: "تمت إضافة الحساب",
  adminDelete: "حذف",
  adminDeleteTitle: "حذف الحساب",
  adminDeleteConfirm: "هل تريد حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.",
  adminDeleteCancel: "إلغاء",
  adminDeleted: "تم حذف الحساب",
};

const en: Record<string, string> = {
  appName: "Study Platform",
  appTagline: "Specialties library & on-demand download links",
  home: "Home",
  search: "Search",
  searchPlaceholder: "Enter the specialty code to search, e.g. MES 0701",
  specialties: "Specialties",
  noResults: "No results match your search",
  emptyTitle: "No specialties yet",
  emptyBody:
    "The catalog is empty. The admin adds content by uploading a Word file from the admin panel.",
  modules: "Modules",
  lessons: "Lessons",
  files: "Files",
  size: "Size",
  type: "Type",
  code: "Code",
  name: "Name",
  version: "Version",
  published: "Last published",
  never: "Never",
  items: "items",
  download: "Download",
  back: "Back",
  detail: "Details",
  linksTitle: "Download links",
  openHint: "The gofile link opens in a new tab — download on demand.",
  downloadLimitMessage: "Downloads are limited by the admin",
  copy: "Copy",
  copied: "Copied",
  login: "Log in",
  register: "Create account",
  logout: "Log out",
  account: "Account",
  email: "Email",
  password: "Password",
  loginTitle: "Welcome, I hope you find what you want",
  loginBody:
    "Sign in to browse specialties and download links. One active session per account. If you can't find your files, contact us so we can provide them.",
  registerTitle: "New account",
  registerBody: "Create your account with email and password to access the catalog.",
  noAccount: "No account yet?",
  haveAccount: "Already have an account?",
  kicked:
    "Your account was signed in on another device, so this session was signed out.",
  wrongCredentials: "Invalid email or password",
  emailExists: "This email is already registered",
  emailNotReal: "Invalid or nonexistent email",
  invalidEmail: "Enter a valid email address",
  passwordMin: "Password must be at least 6 characters",
  sessionLost: "Session ended",
  sessionLostBody: "Sign in again to continue to the specialties library.",
  goToLogin: "Go to sign in",
  adminTitle: "Admin panel",
  adminSignInHelp: "Enter the administrator password. A user account is not required.",
  adminCookieBlocked: "The password was accepted, but your browser did not save the admin session. Open the panel in a separate tab and sign in again.",
  openAdminTab: "Open the panel in a separate tab",
  adminSessionExpired: "Your admin session has ended. Enter the administrator password to continue.",
  adminCatalogUnavailable: "The catalog summary could not be loaded. You are still signed in.",
  adminPublishUnavailable: "The catalog could not be saved. Your file was not published; please retry.",
  adminNotConfigured: "Admin sign-in is not configured. Set ADMIN_PASSWORD on the server.",
  adminBody:
    "Upload a Word file (7-column table) to update the specialties catalog for all users.",
  adminPassword: "Admin password",
  unlock: "Unlock",
  wrongPassword: "Wrong password",
  adminHint: "Demo mode: the default password is admin123",
  uploadFile: "Upload Word file (.docx)",
  dragOrBrowse: "Drag the file here or tap to browse",
  upload: "Upload & publish",
  uploading: "Processing…",
  uploadHint:
    "The 7 columns: index, code, name, type, modules, lessons, links (gofile links inside the last cell).",
  currentCatalog: "Current catalog",
  lastUpload: "Last upload",
  loadDemo: "Load demo data",
  clearAll: "Clear catalog",
  confirmClear: "Are you sure you want to delete all specialties? This cannot be undone.",
  uploadedOk: "Published {n} specialties — version {v}",
  uploadedWarn: "Published with warnings (see below)",
  fileTooBig: "File too large — max 15 MB",
  badFile: "The file must be a .docx",
  error: "Something went wrong",
  retry: "Retry",
  loading: "Loading…",
  offlineNote: "Showing saved copy (you are offline)",
  install: "Install app",
  language: "Language",
  pageNotFound: "Page not found",
  pageNotFoundBody: "The page you are looking for does not exist or was removed.",
  browse: "Browse",
  noTable: "No table found in the file",
  noRows: "No valid rows — ensure 7 columns with a non-empty code column",
  unreadable: "Couldn't read the file — is it a valid .docx?",
  warnNoCode: "Row without code — skipped",
  warnCols: "{n} columns instead of 7",
  linkSheets: "Lesson sheets",
  linkNotes: "Lesson notes",
  footerByline: "Design, publication and sharing rights to Br. Hamza Shaïb",
  uploadSuccess: "Uploaded successfully",
  welcomeMessage: "Welcome, I hope you find what you want",
  idleLoggedOut: "You were automatically signed out after 10 minutes of inactivity",
  blocked: "Account is blocked",
  allSectors: "All",
  sectorFilter: "Specialty sector",
  adminAccounts: "Accounts",
  adminTablePassword: "Password",
  adminTableDownloads: "Downloads",
  adminTableActions: "Actions",
  adminLimit: "Download limit",
  adminLimitUnlimited: "Unlimited",
  adminLimit3: "3 downloads",
  adminLimit10: "10 downloads",
  adminLimit20: "20 downloads",
  adminLimit50: "50 downloads",
  adminLimit150: "150 downloads",
  adminBlock: "Block",
  adminUnblock: "Unblock",
  adminAddAccount: "Add account",
  adminAccountAdded: "Account added",
  adminDelete: "Delete",
  adminDeleteTitle: "Delete account",
  adminDeleteConfirm: "Are you sure you want to delete this account? This action cannot be undone.",
  adminDeleteCancel: "Cancel",
  adminDeleted: "Account deleted",
};

const fr: Record<string, string> = {
  appName: "Plateforme d'étude",
  appTagline: "Bibliothèque de spécialités et liens de téléchargement",
  home: "Accueil",
  search: "Recherche",
  searchPlaceholder: "Rechercher par code de la spécialité, ex. MES 0701",
  specialties: "Spécialités",
  noResults: "Aucun résultat ne correspond à votre recherche",
  emptyTitle: "Aucune spécialité pour le moment",
  emptyBody:
    "Le catalogue est vide. L'administrateur ajoute le contenu via un fichier Word depuis le panneau d'administration.",
  modules: "Modules",
  lessons: "Leçons",
  files: "Fichiers",
  size: "Taille",
  type: "Type",
  code: "Code",
  name: "Nom",
  version: "Version",
  published: "Dernière publication",
  never: "Jamais",
  items: "articles",
  download: "Télécharger",
  back: "Retour",
  detail: "Détails",
  linksTitle: "Liens de téléchargement",
  openHint: "Le lien gofile s'ouvre dans un nouvel onglet — téléchargement à la demande.",
  downloadLimitMessage: "Téléchargements limités par l'administrateur",
  copy: "Copier",
  copied: "Copié",
  login: "Connexion",
  register: "Créer un compte",
  logout: "Déconnexion",
  account: "Compte",
  email: "E-mail",
  password: "Mot de passe",
  loginTitle: "Bienvenue, j'espère que tu Profit",
  loginBody:
    "Connectez-vous pour parcourir les spécialités et les liens de téléchargement. Une seule session active par compte. Si vous ne trouvez pas vos fichiers, contactez-nous pour nous les fournir.",
  registerTitle: "Nouveau compte",
  registerBody:
    "Créez votre compte avec e-mail et mot de passe pour accéder au catalogue.",
  noAccount: "Pas encore de compte ?",
  haveAccount: "Déjà un compte ?",
  kicked:
    "Votre compte a été utilisé sur un autre appareil, cette session a donc été déconnectée.",
  wrongCredentials: "E-mail ou mot de passe incorrect",
  emailExists: "Cet e-mail est déjà enregistré",
  emailNotReal: "E-mail invalide ou inexistant",
  invalidEmail: "Entrez une adresse e-mail valide",
  passwordMin: "Le mot de passe doit contenir au moins 6 caractères",
  sessionLost: "Session terminée",
  sessionLostBody: "Reconnectez-vous pour continuer.",
  goToLogin: "Aller à la connexion",
  adminTitle: "Panneau d'administration",
  adminSignInHelp: "Saisissez le mot de passe administrateur. Aucun compte utilisateur n’est nécessaire.",
  adminCookieBlocked: "Le mot de passe a été accepté, mais le navigateur n’a pas enregistré la session. Ouvrez le panneau dans un nouvel onglet et reconnectez-vous.",
  openAdminTab: "Ouvrir le panneau dans un nouvel onglet",
  adminSessionExpired: "Votre session administrateur a expiré. Saisissez le mot de passe pour continuer.",
  adminCatalogUnavailable: "Impossible de charger le résumé du catalogue. Votre session reste ouverte.",
  adminPublishUnavailable: "Impossible d’enregistrer le catalogue. Le fichier n’a pas été publié ; réessayez.",
  adminNotConfigured: "L’accès administrateur n’est pas configuré. Définissez ADMIN_PASSWORD sur le serveur.",
  adminBody:
    "Chargez un fichier Word (tableau 7 colonnes) pour mettre à jour le catalogue.",
  adminPassword: "Mot de passe administrateur",
  unlock: "Déverrouiller",
  wrongPassword: "Mot de passe incorrect",
  adminHint: "Mode démo : le mot de passe par défaut est admin123",
  uploadFile: "Charger un fichier Word (.docx)",
  dragOrBrowse: "Glissez le fichier ici ou touchez pour parcourir",
  upload: "Charger et publier",
  uploading: "Traitement…",
  uploadHint:
    "Les 7 colonnes : index, code, nom, type, modules, leçons, liens (liens gofile dans la dernière cellule).",
  currentCatalog: "Catalogue actuel",
  lastUpload: "Dernier envoi",
  loadDemo: "Charger des données démo",
  clearAll: "Vider le catalogue",
  confirmClear:
    "Voulez-vous vraiment supprimer toutes les spécialités ? Irréversible.",
  uploadedOk: "Publication de {n} spécialités — version {v}",
  uploadedWarn: "Publié avec des avertissements (voir ci-dessous)",
  fileTooBig: "Fichier trop volumineux — 15 Mo maximum",
  badFile: "Le fichier doit être au format .docx",
  error: "Une erreur est survenue",
  retry: "Réessayer",
  loading: "Chargement…",
  offlineNote: "Affichage de la copie sauvegardée (hors ligne)",
  install: "Installer l'appli",
  language: "Langue",
  pageNotFound: "Page introuvable",
  pageNotFoundBody: "La page que vous cherchez n'existe pas ou a été supprimée.",
  browse: "Parcourir",
  noTable: "Aucun tableau trouvé dans le fichier",
  noRows: "Aucune ligne valide — 7 colonnes avec un code non vide",
  unreadable: "Impossible de lire le fichier — est-ce un .docx valide ?",
  warnNoCode: "Ligne sans code — ignorée",
  warnCols: "{n} colonnes au lieu de 7",
  linkSheets: "Fiches de cours",
  linkNotes: "Notes de cours",
  footerByline: "Droits de conception, publication et partage à Br. Hamza Shaïb",
  uploadSuccess: "Téléversement réussi",
  welcomeMessage: "Bienvenue, mon collègue, j'espère que tu Profit",
  idleLoggedOut: "Vous êtes automatiquement déconnecté après 10 minutes d'inactivité",
  blocked: "Compte bloqué",
  allSectors: "Tous",
  sectorFilter: "Secteur professionnel",
  adminAccounts: "Comptes",
  adminTablePassword: "Mot de passe",
  adminTableDownloads: "Téléchargements",
  adminTableActions: "Actions",
  adminLimit: "Limite de téléchargement",
  adminLimitUnlimited: "Illimité",
  adminLimit3: "3 téléchargements",
  adminLimit10: "10 téléchargements",
  adminLimit20: "20 téléchargements",
  adminLimit50: "50 téléchargements",
  adminLimit150: "150 téléchargements",
  adminBlock: "Bloquer",
  adminUnblock: "Débloquer",
  adminAddAccount: "Ajouter un compte",
  adminAccountAdded: "Compte ajouté",
  adminDelete: "Supprimer",
  adminDeleteTitle: "Supprimer le compte",
  adminDeleteConfirm: "Voulez-vous vraiment supprimer ce compte ? Cette action ne peut pas être annulée.",
  adminDeleteCancel: "Annuler",
  adminDeleted: "Compte supprimé",
};

const DICTS: Record<Locale, Record<string, string>> = { ar, en, fr };

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "ar",
  dir: "rtl",
  setLocale: () => {},
  t: (k) => ar[k] ?? k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dl_lang") as Locale | null;
      if (saved && DICTS[saved]) setLocaleState(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale, ready]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("dl_lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = DICTS[locale][key] ?? ar[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
