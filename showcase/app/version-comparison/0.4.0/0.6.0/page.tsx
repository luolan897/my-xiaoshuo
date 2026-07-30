import { redirect } from "next/navigation";

export default function VersionComparisonDetailPage() {
  redirect("/version-comparison/0.4.0/0.6.0/comparison.html");
}
