"use client";

import { Suspense } from "react";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Loader } from "@mantine/core";
import { VerifyEmailContent } from "./VerifyEmailContent";

export function VerifyEmailClient() {
  return (
    <Suspense
      fallback={
        <AuthLayout ariaLabel="이메일 인증">
          <div
            role="status"
            aria-label="이메일 인증 화면을 불러오는 중"
            style={{ display: "grid", placeItems: "center", padding: "2rem" }}
          >
            <Loader size="sm" />
          </div>
        </AuthLayout>
      }
    >
      <AuthLayout ariaLabel="이메일 인증">
        <VerifyEmailContent />
      </AuthLayout>
    </Suspense>
  );
}
