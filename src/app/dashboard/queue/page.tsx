import { redirect } from "next/navigation";

export default function QueuePage() {
  redirect("/dashboard/appointments?view=queue");
}
