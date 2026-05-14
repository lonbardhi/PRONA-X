export const LOCALE_COOKIE = "prona_locale";
export const locales = ["sq", "en"] as const;
export const defaultLocale = "sq";
export const appTimeZone = "Europe/Tirane";

export type Locale = (typeof locales)[number];

type TranslationKey =
  | "account.workspace"
  | "admin.copy.description"
  | "admin.copy.operators"
  | "admin.copy.pending"
  | "admin.copy.support"
  | "admin.copy.viewers"
  | "admin.heading"
  | "admin.role"
  | "admin.saveRole"
  | "admin.signedIn"
  | "admin.stat.admins"
  | "admin.stat.approved"
  | "admin.stat.pending"
  | "admin.subtitle"
  | "admin.userAccounts"
  | "admin.usersEmpty"
  | "admin.usersIntro"
  | "auth.alreadyAccount"
  | "auth.apple"
  | "auth.createAccount"
  | "auth.createHeading"
  | "auth.createIntro"
  | "auth.confirmPassword"
  | "auth.confirmPasswordPlaceholder"
  | "auth.email"
  | "auth.emailPlaceholder"
  | "auth.emailReset"
  | "auth.forgotPassword"
  | "auth.fullName"
  | "auth.fullNamePlaceholder"
  | "auth.google"
  | "auth.hidePassword"
  | "auth.login"
  | "auth.loginHeading"
  | "auth.loginIntro"
  | "auth.newAccount"
  | "auth.or"
  | "auth.password"
  | "auth.passwordPlaceholder"
  | "auth.passwordRequirements"
  | "auth.recoveryHeading"
  | "auth.recoveryIntro"
  | "auth.rememberPassword"
  | "auth.sendReset"
  | "auth.showPassword"
  | "auth.signIn"
  | "auth.signUp"
  | "auth.updates"
  | "brand.subtitle"
  | "brand.tagline"
  | "common.cancel"
  | "common.clear"
  | "common.clearAll"
  | "common.created"
  | "common.filter"
  | "common.search"
  | "common.support"
  | "common.updated"
  | "language.english"
  | "language.label"
  | "language.albanian"
  | "nav.addProperty"
  | "nav.adminUsers"
  | "nav.calendar"
  | "nav.dashboard"
  | "nav.documents"
  | "nav.land"
  | "nav.messages"
  | "nav.rentals"
  | "nav.sales"
  | "nav.sellerLeads"
  | "nav.share"
  | "nav.support"
  | "notifications"
  | "pending.adminApproval"
  | "pending.askAdmin"
  | "pending.currentRole"
  | "pending.description"
  | "pending.heading"
  | "pending.profileFailed"
  | "pending.signOut"
  | "property.add"
  | "property.area"
  | "property.baths"
  | "property.beds"
  | "property.buildable"
  | "property.filters"
  | "property.land"
  | "property.missingMedia"
  | "property.noMedia"
  | "property.noProperties"
  | "property.noPropertiesHint"
  | "property.ownerPercent"
  | "property.plot"
  | "property.salesFilters"
  | "property.salesProperties"
  | "property.searchPlaceholder"
  | "property.teamCrm"
  | "property.viewer"
  | "support.activity"
  | "support.addReply"
  | "support.adminView"
  | "support.allCategories"
  | "support.allPriorities"
  | "support.allStatuses"
  | "support.assigned"
  | "support.assignTicket"
  | "support.attachments"
  | "support.autoContext"
  | "support.browser"
  | "support.category"
  | "support.contact"
  | "support.contactBody"
  | "support.contactTitle"
  | "support.critical"
  | "support.description"
  | "support.descriptionPlaceholder"
  | "support.device"
  | "support.files"
  | "support.filesHint"
  | "support.filesTitle"
  | "support.heading"
  | "support.inProgress"
  | "support.internalNote"
  | "support.knowledge"
  | "support.lastUpdate"
  | "support.messages"
  | "support.module"
  | "support.noAttachments"
  | "support.noMessages"
  | "support.noProperty"
  | "support.noTickets"
  | "support.noTicketsHint"
  | "support.open"
  | "support.priority"
  | "support.property"
  | "support.replyPlaceholder"
  | "support.report"
  | "support.request"
  | "support.requester"
  | "support.resolved"
  | "support.screen"
  | "support.searchPlaceholder"
  | "support.sendReply"
  | "support.status"
  | "support.steps"
  | "support.stepsPlaceholder"
  | "support.submit"
  | "support.submitting"
  | "support.subtitle"
  | "support.ticketInfo"
  | "support.title"
  | "support.titlePlaceholder"
  | "support.unassigned"
  | "support.uploadContext"
  | "support.url"
  | "support.whatInclude";

type LocaleMessages = Record<TranslationKey, string>;

const messages: Record<Locale, LocaleMessages> = {
  sq: {
    "account.workspace": "Llogari e hapësirës së punës",
    "admin.copy.description":
      "Shqyrto regjistrimet e reja dhe mirato aksesin në CRM duke caktuar role Viewer, Agent, Manager, Support ose Admin. Llogaritë Pending mbeten të bllokuara.",
    "admin.copy.operators":
      "Operatorët janë agjentët, menaxherët dhe adminët që menaxhojnë punën në CRM. Support menaxhon biletat pa akses më të gjerë operatori.",
    "admin.copy.pending": "Përdoruesit Pending shohin vetëm ekranin e miratimit.",
    "admin.copy.support": "Support trajton kërkesat dhe biletat e ndihmës.",
    "admin.copy.viewers":
      "Viewer janë përdorues të jashtëm të miratuar me akses vetëm për lexim.",
    "admin.heading": "Përdoruesit Admin",
    "admin.role": "Roli i aksesit",
    "admin.saveRole": "Ruaj rolin",
    "admin.signedIn": "Kyçur si",
    "admin.stat.admins": "Adminë",
    "admin.stat.approved": "Të miratuar",
    "admin.stat.pending": "Në pritje",
    "admin.subtitle": "Miratim admini",
    "admin.userAccounts": "Llogaritë e hapësirës së punës",
    "admin.usersEmpty": "Ende nuk ka profile përdoruesish.",
    "admin.usersIntro":
      "Promovo vetëm personat që duhet të kenë akses në të dhënat e brendshme të PRONA X.",
    "auth.alreadyAccount": "Ke tashmë llogari?",
    "auth.apple": "Vazhdo me Apple",
    "auth.createAccount": "Krijo llogari",
    "auth.createHeading": "Krijo llogarinë PRONA X",
    "auth.createIntro":
      "Krijo llogari, pastaj një admin do të miratojë aksesin në hapësirën e punës.",
    "auth.confirmPassword": "Konfirmo fjalëkalimin",
    "auth.confirmPasswordPlaceholder": "Shkruaj përsëri fjalëkalimin",
    "auth.email": "Adresa email",
    "auth.emailPlaceholder": "Shkruaj adresën email",
    "auth.emailReset": "Rivendosje me email",
    "auth.forgotPassword": "Ke harruar fjalëkalimin?",
    "auth.fullName": "Emri i plotë",
    "auth.fullNamePlaceholder": "Shkruaj emrin e plotë",
    "auth.google": "Vazhdo me Google",
    "auth.hidePassword": "Fshihe fjalëkalimin",
    "auth.login": "Hyr",
    "auth.loginHeading": "Hyr në PRONA X",
    "auth.loginIntro":
      "Hyr për të menaxhuar inventarin, median, rolet dhe shpërndarjet publike.",
    "auth.newAccount": "I ri në PRONA X?",
    "auth.or": "ose",
    "auth.password": "Fjalëkalimi",
    "auth.passwordPlaceholder": "Shkruaj fjalëkalimin",
    "auth.passwordRequirements":
      "Përdor të paktën 10 karaktere me shkronjë të madhe, shkronjë të vogël, numër dhe simbol.",
    "auth.recoveryHeading": "Rivendos fjalëkalimin",
    "auth.recoveryIntro":
      "Shkruaj emailin dhe do të dërgojmë një link të sigurt rivendosjeje.",
    "auth.rememberPassword": "E kujtove fjalëkalimin?",
    "auth.sendReset": "Dërgo linkun",
    "auth.showPassword": "Shfaq fjalëkalimin",
    "auth.signIn": "Hyr",
    "auth.signUp": "Regjistrohu",
    "auth.updates":
      "Më njofto për lajme platforme, përditësime të proceseve të pronave dhe publikime të PRONA X.",
    "brand.subtitle": "CRM për prona në Shqipëri",
    "brand.tagline": "Operacionet e pronave shqiptare, të markuara nga fillimi në fund.",
    "common.cancel": "Anulo",
    "common.clear": "Pastro",
    "common.clearAll": "Pastro të gjitha",
    "common.created": "Krijuar",
    "common.filter": "Filtro",
    "common.search": "Kërko",
    "common.support": "Ndihmë",
    "common.updated": "Përditësuar",
    "language.english": "Anglisht",
    "language.label": "Gjuha",
    "language.albanian": "Shqip",
    "nav.addProperty": "Shto Pronë",
    "nav.adminUsers": "Përdoruesit",
    "nav.calendar": "Kalendari",
    "nav.dashboard": "Paneli",
    "nav.documents": "Dokumente & Kontrata",
    "nav.land": "Tokë",
    "nav.messages": "Mesazhe",
    "nav.rentals": "Qira",
    "nav.sales": "Shitje",
    "nav.sellerLeads": "Leads Shitësish",
    "nav.share": "Shpërndaj",
    "nav.support": "Ndihmë",
    "notifications": "Njoftimet",
    "pending.adminApproval": "Në pritje të miratimit nga admini",
    "pending.askAdmin":
      "Kërkoji një admini të PRONA X të hapë Përdoruesit Admin dhe ta miratojë këtë llogari si Viewer, Agent, Manager, Support ose Admin.",
    "pending.currentRole": "Roli aktual",
    "pending.description":
      "Përdoruesit e rinj fillojnë si Pending. Një admin mund të miratojë akses Viewer vetëm për lexim ose ta promovojë llogarinë në rol operatori.",
    "pending.heading": "Llogaria jote PRONA X po pret akses.",
    "pending.profileFailed": "Kërkimi i profilit dështoi:",
    "pending.signOut": "Dil",
    "property.add": "Shto pronë",
    "property.area": "Sipërfaqe",
    "property.baths": "Banjo",
    "property.beds": "Dhoma",
    "property.buildable": "Ndërtueshme",
    "property.filters": "Filtra",
    "property.land": "Tokë",
    "property.missingMedia": "Mungon media",
    "property.noMedia": "Pa media",
    "property.noProperties": "Ende nuk ka prona",
    "property.noPropertiesHint": "Rregullo filtrat ose shto pronën e parë për shitje.",
    "property.ownerPercent": "Pronari %",
    "property.plot": "Parcela",
    "property.salesFilters": "Filtra shitjeje",
    "property.salesProperties": "Prona në shitje",
    "property.searchPlaceholder": "Kërko titull, qytet, lagje, përshkrim",
    "property.teamCrm": "CRM ekipi",
    "property.viewer": "PRONA X viewer",
    "support.activity": "Historia e aktivitetit",
    "support.addReply": "Shto përgjigje",
    "support.adminView":
      "Pamje support/admin: mund të shohësh të gjitha biletat dhe shënimet e brendshme.",
    "support.allCategories": "Të gjitha kategoritë",
    "support.allPriorities": "Të gjitha prioritetet",
    "support.allStatuses": "Të gjitha statuset",
    "support.assigned": "Caktuar",
    "support.assignTicket": "Cakto biletën",
    "support.attachments": "Bashkëngjitje",
    "support.autoContext": "Kontekst i kapur automatikisht",
    "support.browser": "Shfletuesi",
    "support.category": "Kategoria",
    "support.contact": "Kontakto ndihmën",
    "support.contactBody":
      "Krijo një biletë për ndihmë të gjurmueshme. Për bllokim urgjent llogarie, dërgo email me adresën e përdoruesit dhe hapësirën e punës.",
    "support.contactTitle": "Kontakto support",
    "support.critical": "Kritike",
    "support.description": "Përshkrimi",
    "support.descriptionPlaceholder":
      "Çfarë ndodhi, çfarë prisje dhe kush është i prekur?",
    "support.device": "Pajisja",
    "support.files": "Skedarë",
    "support.filesHint": "PNG, JPG, WebP, PDF, MP4. Maksimumi 25 MB secili.",
    "support.filesTitle": "Ngarko screenshot, PDF ose MP4 të shkurtër",
    "support.heading": "Ndihmë",
    "support.inProgress": "Në proces",
    "support.internalNote": "Shënim i brendshëm",
    "support.knowledge": "Baza e njohurive",
    "support.lastUpdate": "Përditësimi i fundit",
    "support.messages": "Mesazhe",
    "support.module": "Moduli",
    "support.noAttachments": "Nuk ka bashkëngjitje për biletën.",
    "support.noMessages": "Ende nuk ka përgjigje.",
    "support.noProperty": "Pa pronë të lidhur",
    "support.noTickets": "Nuk u gjetën bileta support",
    "support.noTicketsHint": "Raporto një problem ose pastro filtrat për të parë më shumë bileta.",
    "support.open": "Hapur",
    "support.priority": "Prioriteti",
    "support.property": "Prona e lidhur",
    "support.replyPlaceholder": "Shkruaj një përgjigje...",
    "support.report": "Raporto problem",
    "support.request": "Kërkesë support",
    "support.requester": "Kërkuesi",
    "support.resolved": "Zgjidhur",
    "support.screen": "Ekrani",
    "support.searchPlaceholder": "Kërko ID bilete, titull, përshkrim",
    "support.sendReply": "Dërgo përgjigje",
    "support.status": "Statusi",
    "support.steps": "Hapat për ta riprodhuar",
    "support.stepsPlaceholder": "1. Hape... 2. Kliko... 3. Shiko...",
    "support.submit": "Dërgo biletën",
    "support.submitting": "Duke dërguar...",
    "support.subtitle": "Raporto probleme, kërko ndihmë dhe ndiq biletat e support.",
    "support.ticketInfo": "Informacioni i biletës",
    "support.title": "Titulli",
    "support.titlePlaceholder": "Përmbledhje e shkurtër e problemit",
    "support.unassigned": "E pacaktuar",
    "support.uploadContext": "Çfarë të përfshish",
    "support.url": "URL",
    "support.whatInclude":
      "Titulli, moduli i prekur, hapat, screenshot dhe rezultati i pritur.",
  },
  en: {
    "account.workspace": "Workspace account",
    "admin.copy.description":
      "Review new signups and approve CRM access by assigning Viewer, Agent, Manager, Support, or Admin roles. Pending accounts stay locked out.",
    "admin.copy.operators":
      "Operators are agents, managers, and admins who can manage CRM work. Support users manage ticket triage without broader operator access.",
    "admin.copy.pending": "Pending users can only see the approval screen.",
    "admin.copy.support": "Support handles help requests and ticket triage.",
    "admin.copy.viewers":
      "Viewers are approved external users with read-only inventory access.",
    "admin.heading": "Admin Users",
    "admin.role": "Access role",
    "admin.saveRole": "Save role",
    "admin.signedIn": "Signed in as",
    "admin.stat.admins": "Admins",
    "admin.stat.approved": "Approved",
    "admin.stat.pending": "Pending",
    "admin.subtitle": "Admin approval",
    "admin.userAccounts": "Workspace accounts",
    "admin.usersEmpty": "No user profiles found yet.",
    "admin.usersIntro":
      "Promote only people who should access PRONA X internal CRM data.",
    "auth.alreadyAccount": "Already have an account?",
    "auth.apple": "Continue with Apple",
    "auth.createAccount": "Create account",
    "auth.createHeading": "Create your PRONA X account",
    "auth.createIntro":
      "Create an account, then an admin will approve workspace access.",
    "auth.confirmPassword": "Confirm password",
    "auth.confirmPasswordPlaceholder": "Enter the password again",
    "auth.email": "Email address",
    "auth.emailPlaceholder": "Enter your email address",
    "auth.emailReset": "Email reset",
    "auth.forgotPassword": "Forgot password?",
    "auth.fullName": "Full name",
    "auth.fullNamePlaceholder": "Enter your full name",
    "auth.google": "Continue with Google",
    "auth.hidePassword": "Hide password",
    "auth.login": "Login",
    "auth.loginHeading": "Sign in to PRONA X",
    "auth.loginIntro":
      "Sign in to manage inventory, media, roles, and public shares.",
    "auth.newAccount": "New to PRONA X?",
    "auth.or": "or",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "Enter your password",
    "auth.passwordRequirements":
      "Use at least 10 characters with an uppercase letter, lowercase letter, number, and symbol.",
    "auth.recoveryHeading": "Reset your password",
    "auth.recoveryIntro":
      "Enter your email and we will send a secure reset link.",
    "auth.rememberPassword": "Remember your password?",
    "auth.sendReset": "Send reset link",
    "auth.showPassword": "Show password",
    "auth.signIn": "Sign in",
    "auth.signUp": "Sign Up",
    "auth.updates":
      "Keep me updated with platform news, property workflow updates, and PRONA X release notes.",
    "brand.subtitle": "Albanian Property CRM",
    "brand.tagline": "Albanian property operations, branded end to end.",
    "common.cancel": "Cancel",
    "common.clear": "Clear",
    "common.clearAll": "Clear all",
    "common.created": "Created",
    "common.filter": "Filter",
    "common.search": "Search",
    "common.support": "Support",
    "common.updated": "Updated",
    "language.english": "English",
    "language.label": "Language",
    "language.albanian": "Albanian",
    "nav.addProperty": "Add Property",
    "nav.adminUsers": "Admin Users",
    "nav.calendar": "Calendar",
    "nav.dashboard": "Dashboard",
    "nav.documents": "Documents & Contracts",
    "nav.land": "Land",
    "nav.messages": "Messages",
    "nav.rentals": "Rentals",
    "nav.sales": "Sales",
    "nav.sellerLeads": "Seller Leads",
    "nav.share": "Share",
    "nav.support": "Support",
    "notifications": "Notifications",
    "pending.adminApproval": "Pending admin approval",
    "pending.askAdmin":
      "Ask a PRONA X admin to open Admin Users and approve this account as Viewer, Agent, Manager, Support, or Admin.",
    "pending.currentRole": "Current role",
    "pending.description":
      "New users start as Pending. An admin can approve read-only Viewer access or promote the account to an operator role.",
    "pending.heading": "Your PRONA X account is waiting for access.",
    "pending.profileFailed": "Profile lookup failed:",
    "pending.signOut": "Sign out",
    "property.add": "Add property",
    "property.area": "Area",
    "property.baths": "Baths",
    "property.beds": "Beds",
    "property.buildable": "Buildable",
    "property.filters": "Filters",
    "property.land": "Land",
    "property.missingMedia": "Missing Media",
    "property.noMedia": "No media",
    "property.noProperties": "No properties yet",
    "property.noPropertiesHint": "Adjust the filters or add the first property for sale.",
    "property.ownerPercent": "Owner %",
    "property.plot": "Plot",
    "property.salesFilters": "Sales filters",
    "property.salesProperties": "Sales Properties",
    "property.searchPlaceholder": "Search title, city, neighborhood, description",
    "property.teamCrm": "Team CRM",
    "property.viewer": "PRONA X viewer",
    "support.activity": "Activity history",
    "support.addReply": "Add reply",
    "support.adminView":
      "Support/admin view: you can see all workspace tickets and internal notes.",
    "support.allCategories": "All categories",
    "support.allPriorities": "All priorities",
    "support.allStatuses": "All statuses",
    "support.assigned": "Assigned",
    "support.assignTicket": "Assign ticket",
    "support.attachments": "Attachments",
    "support.autoContext": "Auto-captured context",
    "support.browser": "Browser",
    "support.category": "Category",
    "support.contact": "Contact Support",
    "support.contactBody":
      "Create a ticket for traceable support. For urgent account lockout cases, email support with the affected user email and workspace.",
    "support.contactTitle": "Contact support",
    "support.critical": "Critical",
    "support.description": "Description",
    "support.descriptionPlaceholder":
      "What happened, what did you expect, and who is affected?",
    "support.device": "Device",
    "support.files": "Files",
    "support.filesHint": "PNG, JPG, WebP, PDF, MP4. Max 25 MB each.",
    "support.filesTitle": "Upload screenshots, PDFs, or short MP4s",
    "support.heading": "Support",
    "support.inProgress": "In Progress",
    "support.internalNote": "Internal note",
    "support.knowledge": "Knowledge Base",
    "support.lastUpdate": "Last update",
    "support.messages": "Messages",
    "support.module": "Related module",
    "support.noAttachments": "No ticket attachments.",
    "support.noMessages": "No replies yet.",
    "support.noProperty": "No related property",
    "support.noTickets": "No support tickets found",
    "support.noTicketsHint": "Report an issue or clear filters to see more tickets.",
    "support.open": "Open",
    "support.priority": "Priority",
    "support.property": "Related property",
    "support.replyPlaceholder": "Write a reply...",
    "support.report": "Report issue",
    "support.request": "Support request",
    "support.requester": "Requester",
    "support.resolved": "Resolved",
    "support.screen": "Screen",
    "support.searchPlaceholder": "Search ticket ID, title, description",
    "support.sendReply": "Send reply",
    "support.status": "Status",
    "support.steps": "Steps to reproduce",
    "support.stepsPlaceholder": "1. Open... 2. Click... 3. See...",
    "support.submit": "Submit ticket",
    "support.submitting": "Submitting...",
    "support.subtitle": "Report problems, request help, and track support tickets.",
    "support.ticketInfo": "Ticket information",
    "support.title": "Title",
    "support.titlePlaceholder": "Short summary of the issue",
    "support.unassigned": "Unassigned",
    "support.uploadContext": "What to include",
    "support.url": "URL",
    "support.whatInclude":
      "Ticket title, affected module, steps, screenshots, and expected result.",
  },
};

export function normalizeLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export function t(locale: Locale, key: TranslationKey) {
  return messages[locale][key] || messages.en[key] || key;
}

export function getIntlLocale(locale: Locale) {
  return locale === "sq" ? "sq-AL" : "en-US";
}

export function getRoleLabel(locale: Locale, role: string) {
  const labels: Record<Locale, Record<string, string>> = {
    sq: {
      admin: "Admin",
      agent: "Agjent",
      manager: "Menaxher",
      pending: "Në pritje",
      finance: "Financë",
      legal: "Legal",
      support: "Support",
      viewer: "Viewer",
    },
    en: {
      admin: "Admin",
      agent: "Agent",
      manager: "Manager",
      pending: "Pending approval",
      finance: "Finance",
      legal: "Legal",
      support: "Support",
      viewer: "Viewer",
    },
  };

  return labels[locale][role] || role;
}

export function getAuthHeroSlides(locale: Locale) {
  if (locale === "sq") {
    return [
      {
        image: "/brand/albania-beach-properties-for-sale-2-1920x1920.jpg",
        alt: "Vilë bregdetare shqiptare mbi det",
        quote:
          "Kthe listimet, bisedat në WhatsApp, fotot, dokumentet, vizitat dhe ofertat në një sistem pune të strukturuar për agjencinë.",
        title: "Shitje | Qira | Tokë Zhvillimi",
        subtitle:
          "Menaxho prona premium, marrëveshje me pronarë toke, interes blerësish, takime, oferta, dokumente dhe shpërndarje private.",
        note: "",
      },
      {
        image: "/brand/albania-beachfront-properties-for-sale-1920x1920.jpg",
        alt: "Pronë moderne buzë detit në bregdetin shqiptar",
        quote:
          "Krijo, menaxho dhe shpërnda faqe pronash të markuara me sigurinë e një hapësire pune profesionale.",
        title: "PRONA X Cloud",
        subtitle: "Platformë për operacione pronash",
        note: "Inventar, media, role dhe shpërndarje publike",
      },
      {
        image: "/brand/albania-beach-properties-for-sale-2-1920x1920.jpg",
        alt: "Vilë mesdhetare me pamje deti",
        quote:
          "Kthe çdo listim në një eksperiencë shitjeje të kontrolluar dhe të shpërndash pa ekspozuar mjetet administrative.",
        title: "Listime Gati për Shitje",
        subtitle: "Linke pronash gati për WhatsApp",
        note: "Faqet publike mbeten vetëm për shikim",
      },
    ];
  }

  return [
    {
      image: "/brand/albania-beach-properties-for-sale-2-1920x1920.jpg",
      alt: "Albanian coastal villa on a cliff above the sea",
      quote:
        "Turn scattered listings, WhatsApp chats, photos, documents, viewings, and offers into one polished operating system for your agency.",
      title: "Sales | Rentals | Development Land",
      subtitle:
        "Manage premium properties, landowner agreements, buyer interest, appointments, offers, documents, and private sharing.",
      note: "",
    },
    {
      image: "/brand/albania-beachfront-properties-for-sale-1920x1920.jpg",
      alt: "Beachfront modern property overlooking the Albanian coastline",
      quote:
        "Create, manage, and share polished property pages with the confidence of a branded workspace.",
      title: "PRONA X Cloud",
      subtitle: "Property operations platform",
      note: "Inventory, media, roles, and public sharing",
    },
    {
      image: "/brand/albania-beach-properties-for-sale-2-1920x1920.jpg",
      alt: "Mediterranean villa with sea views and cliffside landscaping",
      quote:
        "Turn every listing into a controlled, shareable sales experience without exposing admin tools.",
      title: "Sales-Ready Listings",
      subtitle: "WhatsApp-ready property links",
      note: "Public pages stay view-only by design",
    },
  ];
}
