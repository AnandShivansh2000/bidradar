import { redirect } from "next/navigation";

export default function OldOpportunityPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/opportunity/${params.id}`);
}
