import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const role = (await cookies()).get("sessionRole")?.value;

  if (role === "staff") redirect("/staff");
  redirect("/login");
}