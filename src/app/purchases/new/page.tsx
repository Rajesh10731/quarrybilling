import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PurchaseForm from "@/components/PurchaseForm";

export default async function NewPurchasePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      <PurchaseForm isEditing={false} />
    </div>
  );
}
