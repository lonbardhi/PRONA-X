import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileWarning,
  Home,
  KeyRound,
  MessageSquare,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAppointmentTimeRange,
  getAppointmentTypeLabels,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments";
import { hasSupabaseEnv } from "@/lib/env";
import { getIntlLocale, type Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  countPhysicalAssets,
  formatPropertyPrice,
  formatStatusLabel,
  isRentalTransaction,
  type PropertyStatus,
  type PropertyTransactionType,
  type PropertyType,
  type RentPeriod,
} from "@/lib/properties";
import { requireApprovedUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PropertyMediaSummary = {
  id: string;
};

type PropertySummary = {
  asset_id: string | null;
  city: string;
  created_at: string;
  id: string;
  neighborhood: string | null;
  price_eur: number | null;
  price_on_request: boolean;
  property_media?: PropertyMediaSummary[] | PropertyMediaSummary | null;
  rent_period: RentPeriod | null;
  status: PropertyStatus;
  title: string;
  transaction_type: PropertyTransactionType;
  type: PropertyType;
  updated_at: string;
};

type RequestSummary = {
  assigned_agent_name: string | null;
  city: string | null;
  created_at: string;
  customer_name: string;
  id: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  property_type: PropertyType | null;
  request_type: "buyer" | "tenant" | "owner" | "investor";
  status: string;
  urgency: "hot" | "warm" | "cold" | string | null;
};

type AppointmentSummary = {
  appointment_type: AppointmentType;
  client_name: string;
  client_phone: string | null;
  ends_at: string;
  id: string;
  location: string | null;
  property?: {
    city: string | null;
    id: string;
    neighborhood: string | null;
    title: string;
    transaction_type: PropertyTransactionType | null;
  } | null | Array<{
    city: string | null;
    id: string;
    neighborhood: string | null;
    title: string;
    transaction_type: PropertyTransactionType | null;
  }>;
  starts_at: string;
  status: AppointmentStatus;
  title: string;
};

type NotificationSummary = {
  conversation_id: string | null;
  created_at: string;
  id: string;
  message: string;
  title: string;
  type: string;
};

type ContractSummary = {
  contract_type: string;
  created_at: string;
  end_date: string | null;
  expires_at: string | null;
  id: string;
  property_id: string | null;
  status: string;
  title: string;
};

type ChecklistSummary = {
  entity_id: string;
  entity_type: string;
  id: string;
  required_document_type: string;
  status: string;
};

type ActionPriority = "urgent" | "high" | "normal";

type ActionItem = {
  description: string;
  href: string;
  icon: LucideIcon;
  id: string;
  meta: string;
  priority: ActionPriority;
  title: string;
};

function countWhere<T>(rows: T[], predicate: (row: T) => boolean) {
  return rows.filter(predicate).length;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isActiveRequest(row: RequestSummary) {
  return !["converted", "lost", "archived"].includes(row.status);
}

function isDue(value: string | null | undefined, before = endOfToday()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date < before;
}

function isOlderThan(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date < addDays(new Date(), -days);
}

function relationCount<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return 0;
  }

  return Array.isArray(value) ? value.length : 1;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function formatShortDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getStagePercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getPriorityVariant(priority: ActionPriority) {
  if (priority === "urgent") {
    return "destructive";
  }

  if (priority === "high") {
    return "warning";
  }

  return "secondary";
}

function getPriorityLabel(priority: ActionPriority, locale: Locale) {
  const labels = {
    en: {
      high: "High",
      normal: "Normal",
      urgent: "Urgent",
    },
    sq: {
      high: "E lartë",
      normal: "Normale",
      urgent: "Urgjente",
    },
  };

  return labels[locale][priority];
}

function buildActionQueue({
  contractsAtRisk,
  dueRequests,
  hotRequests,
  linkedListingCount,
  locale,
  missingDocuments,
  missingMedia,
  overdueFollowups,
  staleDrafts,
  todayAppointments,
  unreadNotifications,
}: {
  contractsAtRisk: number;
  dueRequests: number;
  hotRequests: number;
  linkedListingCount: number;
  locale: Locale;
  missingDocuments: number;
  missingMedia: number;
  overdueFollowups: number;
  staleDrafts: number;
  todayAppointments: number;
  unreadNotifications: number;
}): ActionItem[] {
  const items: ActionItem[] = [];

  if (overdueFollowups > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Ndjekjet e vonuara bllokojnë marrëveshje dhe kërkesa aktive."
          : "Overdue follow-ups are blocking active requests and deals.",
      href: "/appointments",
      icon: Clock3,
      id: "overdue-followups",
      meta: `${overdueFollowups}`,
      priority: "urgent",
      title: locale === "sq" ? "Mbyll ndjekjet e vonuara" : "Clear overdue follow-ups",
    });
  }

  if (hotRequests > 0 || dueRequests > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Kërkesat e nxehta dhe ato me ndjekje sot duhet të përputhen ose kontaktohen."
          : "Hot and due requests need matching or a client touch today.",
      href: "/requests",
      icon: Target,
      id: "hot-requests",
      meta: `${Math.max(hotRequests, dueRequests)}`,
      priority: hotRequests > 0 ? "urgent" : "high",
      title: locale === "sq" ? "Punoni kërkesat prioritare" : "Work priority requests",
    });
  }

  if (contractsAtRisk > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Kontratat në pritje ose në skadim duhet të lëvizin para fundit të ditës."
          : "Pending or expiring contracts need movement before end of day.",
      href: "/documents?tab=contracts",
      icon: FileWarning,
      id: "contract-risk",
      meta: `${contractsAtRisk}`,
      priority: "high",
      title: locale === "sq" ? "Kontrollo rrezikun e kontratave" : "Review contract risk",
    });
  }

  if (missingMedia > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Listimet pa foto ose materiale shiten më ngadalë dhe kërkojnë punë media."
          : "Listings without media move slower and need media work.",
      href: "/properties",
      icon: Camera,
      id: "missing-media",
      meta: `${missingMedia}`,
      priority: "high",
      title: locale === "sq" ? "Plotëso listimet pa media" : "Complete listings without media",
    });
  }

  if (missingDocuments > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Dokumentet e munguara vonojnë ofertat, kontratat dhe miratimet."
          : "Missing documents slow offers, contracts, and approvals.",
      href: "/documents",
      icon: ClipboardList,
      id: "missing-documents",
      meta: `${missingDocuments}`,
      priority: "high",
      title: locale === "sq" ? "Mbyll dokumentet e munguara" : "Resolve missing documents",
    });
  }

  if (staleDrafts > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Draftet e vjetra duhet publikuar, caktuar ose arkivuar."
          : "Old drafts should be published, assigned, or archived.",
      href: "/properties",
      icon: AlertTriangle,
      id: "stale-drafts",
      meta: `${staleDrafts}`,
      priority: "normal",
      title: locale === "sq" ? "Pastro draftet e vjetra" : "Clean up old drafts",
    });
  }

  if (todayAppointments > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Vizitat dhe telefonatat e sotme janë kanali kryesor i konvertimit."
          : "Today’s viewings and calls are the primary conversion channel.",
      href: "/appointments",
      icon: CalendarDays,
      id: "today-field-ops",
      meta: `${todayAppointments}`,
      priority: "normal",
      title: locale === "sq" ? "Koordino terrenin e sotëm" : "Coordinate today’s field work",
    });
  }

  if (unreadNotifications > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Përmendjet dhe mesazhet e palexuara mund të mbajnë vendime pezull."
          : "Unread mentions and messages can hold decisions in limbo.",
      href: "/messages",
      icon: MessageSquare,
      id: "unread-messages",
      meta: `${unreadNotifications}`,
      priority: "normal",
      title: locale === "sq" ? "Përgjigju sinjaleve të ekipit" : "Respond to team signals",
    });
  }

  if (linkedListingCount > 0) {
    items.push({
      description:
        locale === "sq"
          ? "Asetet me shitje dhe qira duhet të qëndrojnë të sinkronizuara."
          : "Assets listed for both sale and rent need synced reporting.",
      href: "/properties",
      icon: Building2,
      id: "linked-assets",
      meta: `${linkedListingCount}`,
      priority: "normal",
      title: locale === "sq" ? "Kontrollo asetet e lidhura" : "Review linked assets",
    });
  }

  if (items.length === 0) {
    items.push({
      description:
        locale === "sq"
          ? "Nuk ka bllokues të dukshëm. Fokusohu te kërkesa të reja dhe pipeline."
          : "No visible blockers. Focus on new demand and pipeline movement.",
      href: "/requests",
      icon: CheckCircle2,
      id: "all-clear",
      meta: "0",
      priority: "normal",
      title: locale === "sq" ? "Operacionet janë të qeta" : "Operations are clear",
    });
  }

  return items.slice(0, 7);
}

function MetricTile({
  accent = "slate",
  href,
  icon: Icon,
  label,
  sublabel,
  value,
}: {
  accent?: "slate" | "emerald" | "amber" | "rose" | "blue" | "cyan";
  href?: string;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  value: number | string;
}) {
  const accentClass = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    cyan: "bg-cyan-50 text-cyan-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  }[accent];
  const content = (
    <Card className="h-full transition-colors hover:border-emerald-200">
      <CardContent className="flex h-full items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold leading-none text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-500">{sublabel}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link className="block h-full" href={href}>
      {content}
    </Link>
  );
}

function PipelineStage({
  label,
  total,
  value,
}: {
  label: string;
  total: number;
  value: number;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-semibold text-slate-950">{value}</span>
      </div>
      <Progress value={getStagePercent(value, total)} />
    </div>
  );
}

function ActionQueue({
  actions,
  locale,
}: {
  actions: ActionItem[];
  locale: Locale;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{locale === "sq" ? "Radha operative" : "Operational queue"}</CardTitle>
            <CardDescription>
              {locale === "sq"
                ? "Punët që duhet të lëvizin sot, të renditura sipas rrezikut."
                : "Work that should move today, ordered by operational risk."}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {locale === "sq" ? `${actions.length} sinjale` : `${actions.length} signals`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === "sq" ? "Prioriteti" : "Priority"}</TableHead>
              <TableHead>{locale === "sq" ? "Puna" : "Work"}</TableHead>
              <TableHead className="text-right">{locale === "sq" ? "Numër" : "Count"}</TableHead>
              <TableHead className="w-[104px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <TableRow key={action.id}>
                  <TableCell>
                    <Badge variant={getPriorityVariant(action.priority)}>
                      {getPriorityLabel(action.priority, locale)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[220px] items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-950">{action.title}</p>
                        <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-lg font-semibold text-slate-950">
                    {action.meta}
                  </TableCell>
                  <TableCell>
                    <Link
                      className={buttonVariants({
                        className: "h-8 w-full px-2",
                        size: "sm",
                        variant: "outline",
                      })}
                      href={action.href}
                    >
                      {locale === "sq" ? "Hap" : "Open"}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CompactList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: Array<{
    badge?: string;
    description: string;
    href: string;
    title: string;
  }>;
  title: string;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <Link
              className="rounded-md border border-slate-200 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
              href={item.href}
              key={`${item.title}-${item.description}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
                {item.badge ? (
                  <Badge className="shrink-0" variant="secondary">
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          {empty}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const nextWeek = addDays(todayStart, 7);
  const nextMonth = addDays(todayStart, 30);

  const [
    propertyResult,
    requestResult,
    appointmentResult,
    notificationResult,
    contractResult,
    checklistResult,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id,asset_id,title,type,status,transaction_type,city,neighborhood,price_eur,price_on_request,rent_period,created_at,updated_at,property_media(id)",
      )
      .limit(1000),
    supabase
      .from("crm_requests")
      .select(
        "id,request_type,status,customer_name,city,property_type,urgency,next_follow_up_at,last_contacted_at,assigned_agent_name,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("appointments")
      .select(
        "id,title,status,appointment_type,client_name,client_phone,starts_at,ends_at,location,property:properties(id,title,city,neighborhood,transaction_type)",
      )
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", nextWeek.toISOString())
      .order("starts_at", { ascending: true })
      .limit(20),
    supabase
      .from("notifications")
      .select("id,title,message,type,conversation_id,created_at")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("contracts")
      .select("id,title,contract_type,status,property_id,end_date,expires_at,created_at")
      .limit(1000),
    supabase
      .from("document_checklist_items")
      .select("id,entity_type,entity_id,required_document_type,status")
      .in("status", ["Missing", "Rejected", "Expired"])
      .limit(1000),
  ]);

  const properties = propertyResult.error
    ? []
    : ((propertyResult.data || []) as unknown as PropertySummary[]);
  const requests = requestResult.error
    ? []
    : ((requestResult.data || []) as RequestSummary[]);
  const appointments = appointmentResult.error
    ? []
    : ((appointmentResult.data || []) as AppointmentSummary[]);
  const notifications = notificationResult.error
    ? []
    : ((notificationResult.data || []) as NotificationSummary[]);
  const contracts = contractResult.error
    ? []
    : ((contractResult.data || []) as ContractSummary[]);
  const checklistItems = checklistResult.error
    ? []
    : ((checklistResult.data || []) as ChecklistSummary[]);

  const sales = properties.filter((row) => row.transaction_type === "sale");
  const rentals = properties.filter((row) => isRentalTransaction(row.transaction_type));
  const activeRequests = requests.filter(isActiveRequest);
  const todayAppointments = appointments.filter((appointment) => {
    const startsAt = new Date(appointment.starts_at);
    return startsAt >= todayStart && startsAt < todayEnd;
  });
  const overdueFollowups = appointments.filter(
    (appointment) =>
      appointment.appointment_type === "follow_up" &&
      appointment.status === "scheduled" &&
      new Date(appointment.starts_at) < new Date(),
  );
  const hotRequests = activeRequests.filter((request) => request.urgency === "hot");
  const dueRequests = activeRequests.filter((request) =>
    isDue(request.next_follow_up_at, todayEnd),
  );
  const missingMediaProperties = properties.filter(
    (property) =>
      !["archived", "sold", "rented", "completed", "withdrawn"].includes(property.status) &&
      relationCount(property.property_media) === 0,
  );
  const staleDrafts = properties.filter(
    (property) => property.status === "draft" && isOlderThan(property.created_at, 7),
  );
  const contractsAtRisk = contracts.filter((contract) => {
    if (
      [
        "Pending Legal Review",
        "Pending Finance Review",
        "Pending Manager Approval",
        "Expiring Soon",
      ].includes(contract.status)
    ) {
      return true;
    }

    const expiry = contract.expires_at || contract.end_date;
    return Boolean(expiry && isDue(expiry, nextMonth));
  });
  const linkedListingCount = properties.length - countPhysicalAssets(properties);
  const unreadMessageSignals = notifications.filter((notification) =>
    ["message", "mention", "property_message", "lead_message", "meeting_message"].includes(
      notification.type,
    ),
  );

  const salesMetrics = {
    active: countWhere(sales, (row) =>
      ["published", "negotiation", "reserved"].includes(row.status),
    ),
    negotiations: countWhere(sales, (row) => row.status === "negotiation"),
    reservations: countWhere(sales, (row) => row.status === "reserved"),
    sold: countWhere(sales, (row) => row.status === "sold"),
  };
  const rentalMetrics = {
    active: countWhere(rentals, (row) =>
      ["published", "available", "viewing", "reserved", "contract_drafting"].includes(
        row.status,
      ),
    ),
    contracts: countWhere(rentals, (row) =>
      ["rented", "contract_active", "contract_expiring"].includes(row.status),
    ),
    reservations: countWhere(rentals, (row) => row.status === "reserved"),
    viewings: countWhere(rentals, (row) => row.status === "viewing"),
  };
  const requestMetrics = {
    active: activeRequests.length,
    buyers: requests.filter((row) => row.request_type === "buyer").length,
    investors: requests.filter((row) => row.request_type === "investor").length,
    owners: requests.filter((row) => row.request_type === "owner").length,
    tenants: requests.filter((row) => row.request_type === "tenant").length,
  };

  const actionQueue = buildActionQueue({
    contractsAtRisk: contractsAtRisk.length,
    dueRequests: dueRequests.length,
    hotRequests: hotRequests.length,
    linkedListingCount,
    locale,
    missingDocuments: checklistItems.length,
    missingMedia: missingMediaProperties.length,
    overdueFollowups: overdueFollowups.length,
    staleDrafts: staleDrafts.length,
    todayAppointments: todayAppointments.length,
    unreadNotifications: notifications.length,
  });
  const appointmentTypeLabels = getAppointmentTypeLabels(locale);

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                PRONA X CRM
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {locale === "sq" ? "Paneli i komandës" : "Command dashboard"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {locale === "sq"
                  ? "Fokusi ditor: kërkesa, takime, listime, media, dokumente dhe vendime që kërkojnë lëvizje."
                  : "Daily focus: requests, meetings, listings, media, documents, and decisions that need movement."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
              <Link
                className={buttonVariants({ className: "w-full", variant: "default" })}
                href="/sales#add-property"
              >
                <Plus className="h-4 w-4" />
                {locale === "sq" ? "Shto shitje" : "Add sale"}
              </Link>
              <Link
                className={buttonVariants({ className: "w-full", variant: "success" })}
                href="/rentals#add-property"
              >
                <Plus className="h-4 w-4" />
                {locale === "sq" ? "Shto qira" : "Add rental"}
              </Link>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricTile
            accent={overdueFollowups.length > 0 ? "rose" : "emerald"}
            href="/appointments"
            icon={Clock3}
            label={locale === "sq" ? "Ndjekje vonë" : "Overdue"}
            sublabel={locale === "sq" ? "telefonata / follow-up" : "calls / follow-ups"}
            value={overdueFollowups.length}
          />
          <MetricTile
            accent={hotRequests.length > 0 ? "rose" : "cyan"}
            href="/requests"
            icon={Target}
            label={locale === "sq" ? "Kërkesa hot" : "Hot requests"}
            sublabel={locale === "sq" ? "duan kontakt sot" : "need contact today"}
            value={hotRequests.length}
          />
          <MetricTile
            accent="blue"
            href="/appointments"
            icon={CalendarDays}
            label={locale === "sq" ? "Takime sot" : "Today"}
            sublabel={locale === "sq" ? "vizita dhe telefonata" : "viewings and calls"}
            value={todayAppointments.length}
          />
          <MetricTile
            accent={missingMediaProperties.length > 0 ? "amber" : "emerald"}
            href="/properties"
            icon={Camera}
            label={locale === "sq" ? "Pa media" : "No media"}
            sublabel={locale === "sq" ? "listime aktive" : "active listings"}
            value={missingMediaProperties.length}
          />
          <MetricTile
            accent={contractsAtRisk.length > 0 ? "amber" : "emerald"}
            href="/documents?tab=contracts"
            icon={FileWarning}
            label={locale === "sq" ? "Rrezik kontrate" : "Contract risk"}
            sublabel={locale === "sq" ? "miratim / skadim" : "approval / expiry"}
            value={contractsAtRisk.length}
          />
          <MetricTile
            accent={notifications.length > 0 ? "amber" : "slate"}
            href="/messages"
            icon={Bell}
            label={locale === "sq" ? "Sinjale ekipi" : "Team signals"}
            sublabel={locale === "sq" ? "njoftime pa lexuar" : "unread notifications"}
            value={notifications.length}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <ActionQueue actions={actionQueue} locale={locale} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{locale === "sq" ? "Terreni sot" : "Field work today"}</CardTitle>
              <CardDescription>
                {locale === "sq"
                  ? "Takime, vizita dhe telefonata me kohë të afërt."
                  : "Meetings, viewings, and calls closest to now."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              <CompactList
                empty={locale === "sq" ? "Nuk ka takime për sot." : "No meetings today."}
                items={todayAppointments.slice(0, 4).map((appointment) => {
                  const property = firstRelation(appointment.property);

                  return {
                    badge: appointmentTypeLabels[appointment.appointment_type],
                    description: `${formatAppointmentTimeRange(
                      appointment.starts_at,
                      appointment.ends_at,
                      locale,
                    )} · ${appointment.client_name}${
                      property ? ` · ${property.title}` : ""
                    }`,
                    href: "/appointments",
                    title: appointment.title,
                  };
                })}
                title={locale === "sq" ? "Agjenda" : "Agenda"}
              />
              <Separator />
              <CompactList
                empty={
                  locale === "sq"
                    ? "Nuk ka mesazhe ose përmendje të hapura."
                    : "No open messages or mentions."
                }
                items={unreadMessageSignals.slice(0, 3).map((notification) => ({
                  badge: notification.type.replaceAll("_", " "),
                  description: notification.message,
                  href: notification.conversation_id
                    ? `/messages?conversation=${notification.conversation_id}`
                    : "/messages",
                  title: notification.title,
                }))}
                title={locale === "sq" ? "Komunikime" : "Communication"}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{locale === "sq" ? "Pipeline shitjeje" : "Sales pipeline"}</CardTitle>
                  <CardDescription>
                    {locale === "sq"
                      ? "Inventar shitjeje, negociata, rezervime dhe mbyllje."
                      : "Sales inventory, negotiations, reservations, and closings."}
                  </CardDescription>
                </div>
                <Badge variant="outline">{sales.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  accent="blue"
                  icon={Home}
                  label={locale === "sq" ? "Aktive" : "Active"}
                  sublabel={locale === "sq" ? "publikuar / negociata" : "published / live"}
                  value={salesMetrics.active}
                />
                <MetricTile
                  accent="emerald"
                  icon={TrendingUp}
                  label={locale === "sq" ? "Të shitura" : "Sold"}
                  sublabel={locale === "sq" ? "mbyllje të regjistruara" : "registered closings"}
                  value={salesMetrics.sold}
                />
              </div>
              <PipelineStage
                label={locale === "sq" ? "Negociata" : "Negotiations"}
                total={Math.max(1, sales.length)}
                value={salesMetrics.negotiations}
              />
              <PipelineStage
                label={locale === "sq" ? "Rezervime" : "Reservations"}
                total={Math.max(1, sales.length)}
                value={salesMetrics.reservations}
              />
              <Link
                className={buttonVariants({ className: "w-full", variant: "outline" })}
                href="/sales"
              >
                {locale === "sq" ? "Hap shitjet" : "Open sales"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{locale === "sq" ? "Pipeline qiraje" : "Rental pipeline"}</CardTitle>
                  <CardDescription>
                    {locale === "sq"
                      ? "Disponueshmëri, vizita, rezervime dhe kontrata aktive."
                      : "Availability, viewings, reservations, and active contracts."}
                  </CardDescription>
                </div>
                <Badge variant="outline">{rentals.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  accent="emerald"
                  icon={KeyRound}
                  label={locale === "sq" ? "Aktive" : "Active"}
                  sublabel={locale === "sq" ? "qira në treg" : "rental inventory"}
                  value={rentalMetrics.active}
                />
                <MetricTile
                  accent="cyan"
                  icon={Building2}
                  label={locale === "sq" ? "Kontrata" : "Contracts"}
                  sublabel={locale === "sq" ? "aktive / në skadim" : "active / expiring"}
                  value={rentalMetrics.contracts}
                />
              </div>
              <PipelineStage
                label={locale === "sq" ? "Vizita" : "Viewings"}
                total={Math.max(1, rentals.length)}
                value={rentalMetrics.viewings}
              />
              <PipelineStage
                label={locale === "sq" ? "Rezervime" : "Reservations"}
                total={Math.max(1, rentals.length)}
                value={rentalMetrics.reservations}
              />
              <Link
                className={buttonVariants({ className: "w-full", variant: "outline" })}
                href="/rentals"
              >
                {locale === "sq" ? "Hap qiratë" : "Open rentals"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{locale === "sq" ? "Kërkesa & përputhje" : "Demand & matching"}</CardTitle>
              <CardDescription>
                {locale === "sq"
                  ? "Kërkesat mbeten të ndara nga listimet për raportim të saktë."
                  : "Requests stay separate from listings for clean reporting."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <PipelineStage
                  label={locale === "sq" ? "Blerës" : "Buyers"}
                  total={Math.max(1, requests.length)}
                  value={requestMetrics.buyers}
                />
                <PipelineStage
                  label={locale === "sq" ? "Qiramarrës" : "Tenants"}
                  total={Math.max(1, requests.length)}
                  value={requestMetrics.tenants}
                />
                <PipelineStage
                  label={locale === "sq" ? "Pronarë" : "Owners"}
                  total={Math.max(1, requests.length)}
                  value={requestMetrics.owners}
                />
                <PipelineStage
                  label={locale === "sq" ? "Investitorë" : "Investors"}
                  total={Math.max(1, requests.length)}
                  value={requestMetrics.investors}
                />
              </div>
              <Separator />
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">
                    {locale === "sq" ? "Aktive" : "Active"}
                  </span>
                  <span className="font-semibold text-slate-950">{requestMetrics.active}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">
                    {locale === "sq" ? "Ndjekje sot" : "Due today"}
                  </span>
                  <span className="font-semibold text-slate-950">{dueRequests.length}</span>
                </div>
              </div>
              <Link
                className={buttonVariants({ className: "w-full", variant: "outline" })}
                href="/requests"
              >
                {locale === "sq" ? "Hap kërkesat" : "Open requests"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{locale === "sq" ? "Shëndeti i listimeve" : "Listing health"}</CardTitle>
              <CardDescription>
                {locale === "sq"
                  ? "Cilësia e inventarit para se të publikohet ose ndahet."
                  : "Inventory quality before it gets published or shared."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              <div className="grid gap-3">
                <PipelineStage
                  label={locale === "sq" ? "Asete fizike" : "Physical assets"}
                  total={Math.max(1, properties.length)}
                  value={countPhysicalAssets(properties)}
                />
                <PipelineStage
                  label={locale === "sq" ? "Listime të lidhura" : "Linked listings"}
                  total={Math.max(1, properties.length)}
                  value={linkedListingCount}
                />
                <PipelineStage
                  label={locale === "sq" ? "Pa media" : "No media"}
                  total={Math.max(1, properties.length)}
                  value={missingMediaProperties.length}
                />
                <PipelineStage
                  label={locale === "sq" ? "Drafte të vjetra" : "Old drafts"}
                  total={Math.max(1, properties.length)}
                  value={staleDrafts.length}
                />
              </div>
              <CompactList
                empty={
                  locale === "sq"
                    ? "Nuk ka listime aktive pa media."
                    : "No active listings without media."
                }
                items={missingMediaProperties.slice(0, 3).map((property) => ({
                  badge: formatStatusLabel(property.status, locale),
                  description: `${property.city}${
                    property.neighborhood ? ` · ${property.neighborhood}` : ""
                  } · ${formatPropertyPrice(property, locale)}`,
                  href: `/properties/${property.id}/edit`,
                  title: property.title,
                }))}
                title={locale === "sq" ? "Pa media" : "Without media"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{locale === "sq" ? "Dokumente & kontrata" : "Documents & contracts"}</CardTitle>
              <CardDescription>
                {locale === "sq"
                  ? "Rreziqe që mund të bllokojnë rezervime, shitje ose qira."
                  : "Risks that can block reservations, sales, or rentals."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  accent={checklistItems.length > 0 ? "amber" : "emerald"}
                  icon={ClipboardList}
                  label={locale === "sq" ? "Mungojnë" : "Missing"}
                  sublabel={locale === "sq" ? "dokumente" : "documents"}
                  value={checklistItems.length}
                />
                <MetricTile
                  accent={contractsAtRisk.length > 0 ? "amber" : "emerald"}
                  icon={FileWarning}
                  label={locale === "sq" ? "Në rrezik" : "At risk"}
                  sublabel={locale === "sq" ? "kontrata" : "contracts"}
                  value={contractsAtRisk.length}
                />
              </div>
              <CompactList
                empty={
                  locale === "sq"
                    ? "Nuk ka kontrata me rrezik të afërt."
                    : "No immediate contract risks."
                }
                items={contractsAtRisk.slice(0, 3).map((contract) => ({
                  badge: contract.status,
                  description:
                    contract.expires_at || contract.end_date
                      ? `${locale === "sq" ? "Afati" : "Due"} ${formatShortDate(
                          contract.expires_at || contract.end_date || contract.created_at,
                          locale,
                        )}`
                      : contract.contract_type.replaceAll("_", " "),
                  href: "/documents?tab=contracts",
                  title: contract.title,
                }))}
                title={locale === "sq" ? "Kontrata" : "Contracts"}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{locale === "sq" ? "Kërkesa të nxehta" : "Hot demand"}</CardTitle>
              <CardDescription>
                {locale === "sq"
                  ? "Klientët që duhet të marrin përgjigje ose përputhje."
                  : "Clients that need a response or a match."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === "sq" ? "Klienti" : "Client"}</TableHead>
                    <TableHead>{locale === "sq" ? "Tipi" : "Type"}</TableHead>
                    <TableHead>{locale === "sq" ? "Vendndodhja" : "Location"}</TableHead>
                    <TableHead>{locale === "sq" ? "Ndjekje" : "Follow-up"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(hotRequests.length > 0 ? hotRequests : dueRequests).slice(0, 5).map(
                    (request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-semibold text-slate-950">
                          {request.customer_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={request.urgency === "hot" ? "destructive" : "secondary"}>
                            {request.request_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {request.city || (locale === "sq" ? "Pa qytet" : "No city")}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {request.next_follow_up_at
                            ? formatShortDateTime(request.next_follow_up_at, locale)
                            : locale === "sq"
                              ? "Pa datë"
                              : "No date"}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                  {hotRequests.length === 0 && dueRequests.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-slate-500" colSpan={4}>
                        {locale === "sq"
                          ? "Nuk ka kërkesa të nxehta ose me ndjekje sot."
                          : "No hot or due requests today."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{locale === "sq" ? "Lëvizjet e ardhshme" : "Upcoming movement"}</CardTitle>
              <CardDescription>
                {locale === "sq"
                  ? "Takimet e javës dhe listimet me aktivitet të afërt."
                  : "This week’s appointments and listings with recent movement."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === "sq" ? "Koha" : "Time"}</TableHead>
                    <TableHead>{locale === "sq" ? "Takimi" : "Meeting"}</TableHead>
                    <TableHead>{locale === "sq" ? "Pronë" : "Property"}</TableHead>
                    <TableHead>{locale === "sq" ? "Fluksi" : "Flow"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.slice(0, 6).map((appointment) => {
                    const property = firstRelation(appointment.property);

                    return (
                      <TableRow key={appointment.id}>
                        <TableCell className="whitespace-nowrap text-slate-600">
                          {formatShortDateTime(appointment.starts_at, locale)}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-slate-950">{appointment.title}</p>
                          <p className="text-xs text-slate-500">{appointment.client_name}</p>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {property?.title || (locale === "sq" ? "Pa pronë" : "No property")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {property?.transaction_type
                              ? isRentalTransaction(property.transaction_type)
                                ? locale === "sq"
                                  ? "Qira"
                                  : "Rental"
                                : locale === "sq"
                                  ? "Shitje"
                                  : "Sale"
                              : "-"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {appointments.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-slate-500" colSpan={4}>
                        {locale === "sq"
                          ? "Nuk ka takime të ardhshme në kalendar."
                          : "No upcoming appointments in the calendar."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </section>
    </DashboardShell>
  );
}
