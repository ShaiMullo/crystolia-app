import { redirect } from "next/navigation";

// The bare domain root has no locale — send visitors to the default-locale
// landing page instead of rendering an unlocalized shell.
export default function Home() {
    redirect("/he");
}
