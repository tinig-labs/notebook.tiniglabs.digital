"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Labels moved into the Library tab. */
export default function LabelsRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/app/library?tab=labels"), [router]);
  return null;
}
