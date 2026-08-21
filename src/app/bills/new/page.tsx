import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import BillForm from "@/components/BillForm";

export default async function NewBillPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <BillForm isEditing={false} />;
}
