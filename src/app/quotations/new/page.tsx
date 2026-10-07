import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import QuotationForm from "@/components/QuotationForm";

export default async function NewQuotationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <QuotationForm isEditing={false} />;
}
