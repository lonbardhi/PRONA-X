import { PropertyModulePage } from "@/app/properties/page";
import type { PropertySearchParams } from "@/lib/property-filters";

type RentalsPageProps = {
  searchParams: Promise<PropertySearchParams>;
};

export default function RentalsPage(props: RentalsPageProps) {
  return <PropertyModulePage {...props} module="rentals" />;
}
