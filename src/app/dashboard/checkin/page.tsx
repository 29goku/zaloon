import { redirect } from "next/navigation";

export default function CheckInBoardPage() {
  redirect("/dashboard/appointments?view=checkin");
}
