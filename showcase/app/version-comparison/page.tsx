import { redirect } from "next/navigation";

export default function VersionComparisonPage() {
  redirect("/version-comparison/0.4.0/0.6.0");
}
