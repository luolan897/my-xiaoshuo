import { redirect } from "next/navigation";

const demoUrl = "https://showcase.scriverse.top/";

export default function DemoPage() {
  redirect(demoUrl);
}
