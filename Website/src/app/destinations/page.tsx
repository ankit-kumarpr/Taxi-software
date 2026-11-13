import { redirect } from "next/navigation";

/** Old destinations URL → packages */
export default function DestinationsRedirectPage() {
  redirect("/tour-packages");
}
