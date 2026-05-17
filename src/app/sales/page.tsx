import { PropertyModulePage } from "@/app/properties/page";
import type { PropertySearchParams } from "@/lib/property-filters";

type SalesPageProps = {
  searchParams: Promise<PropertySearchParams>;
};

export default function SalesPage(props: SalesPageProps) {
  return <PropertyModulePage {...props} module="sales" />;
}
