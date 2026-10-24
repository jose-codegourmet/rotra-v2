import { redirect } from "next/navigation";

/** Business docs use `/home`; the app shell lives at `/dashboard`. */
export default function HomeAliasPage() {
	redirect("/dashboard");
}
