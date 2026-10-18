"use client";

import type { ReactNode } from "react";

import { LoginHero } from "@/components/common/LoginHero";
import classes from "./AuthLayout.module.css";

type AuthLayoutProps = {
  /** 우측/하단 폼 영역. max-width 25rem 컨테이너 안에 들어갑니다. */
  children: ReactNode;
  ariaLabel?: string;
};

export function AuthLayout({ children, ariaLabel }: AuthLayoutProps) {
  return (
    <main className={classes.page}>
      <div className={classes.hero}>
        <LoginHero />
      </div>
      <section className={classes.formArea} aria-label={ariaLabel}>
        <div className={classes.formContainer}>{children}</div>
      </section>
    </main>
  );
}
