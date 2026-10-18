"use client";

import { Suspense } from "react";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Loader } from "@mantine/core";
import { ResetPasswordContent } from "./ResetPasswordContent";

export function ResetPasswordClient() {
  return (
    <Suspense
      fallback={
        <AuthLayout ariaLabel="비밀번호 재설정">
          <div
            role="status"
            aria-label="비밀번호 재설정 화면을 불러오는 중"
            style={{ display: "grid", placeItems: "center", padding: "2rem" }}
          >
            <Loader size="sm" />
          </div>
        </AuthLayout>
      }
    >
      <AuthLayout ariaLabel="비밀번호 재설정">
        <ResetPasswordContent />
      </AuthLayout>
    </Suspense>
  );
}
