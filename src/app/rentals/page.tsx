import { redirect } from "next/navigation";

export default function RentalsRedirectPage() {
  redirect("/sales?status=rented");
}
