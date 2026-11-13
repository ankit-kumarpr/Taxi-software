import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Old destination detail URL → package detail */
export default async function DestinationSlugRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/tour-packages/${slug}`);
}
