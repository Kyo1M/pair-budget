import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-gray-500">
          ダッシュボードを読み込み中...
        </p>
      }
    >
      <DashboardPage />
    </Suspense>
  );
}
