"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Button,
  Collapse,
  Divider,
  Loader,
  PasswordInput,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import {
  AUTH_NAME_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  type AuthField,
  type AuthFieldError,
} from "@/lib/authValidation";
import { LoginHero } from "@/components/common/LoginHero";
import { useAuthForm } from "./hooks/useAuthForm";
import { AuthAlerts } from "./modules/AuthAlerts";
import { GoogleIcon } from "./modules/GoogleIcon";
import classes from "./Login.module.css";

const FIELD_ERROR_MESSAGES: Record<AuthFieldError, string> = {
  nameTooLong: `이름은 ${AUTH_NAME_MAX_LENGTH}자 이내로 입력해 주세요.`,
  emailRequired: "이메일을 입력해 주세요.",
  emailInvalid: "올바른 이메일 형식이 아니에요.",
  passwordRequired: "비밀번호를 입력해 주세요.",
  passwordLength: `비밀번호는 ${AUTH_PASSWORD_MIN_LENGTH}~${AUTH_PASSWORD_MAX_LENGTH}자여야 해요.`,
};

// useSearchParams를 쓰는 LoginContent는 Suspense 경계 안쪽에 있어야 합니다.
export function LoginClient() {
  return (
    <Suspense
      fallback={
        <div
          className={classes.loading}
          role="status"
          aria-label="로그인 화면을 불러오는 중"
        >
          <Loader size="sm" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const form = useAuthForm();
  const { mode, values, submitting, showPassword } = form;
  const isSignup = mode === "signup";

  function fieldError(field: AuthField) {
    const code = form.fieldErrors[field];
    return code ? FIELD_ERROR_MESSAGES[code] : undefined;
  }

  return (
    <main className={classes.page}>
      <div className={classes.hero}>
        <LoginHero />
      </div>

      <section className={classes.formArea} aria-label="로그인 및 회원가입">
        <div className={classes.formContainer}>
          <SegmentedControl
            fullWidth
            value={mode}
            onChange={form.changeMode}
            disabled={submitting}
            aria-label="로그인 또는 회원가입 선택"
            data={[
              { value: "login", label: "로그인" },
              { value: "signup", label: "가입" },
            ]}
            classNames={{
              root: classes.switcher,
              label: classes.switcherLabel,
              indicator: classes.switcherIndicator,
            }}
          />

          <AuthAlerts
            googleFailed={form.googleFailed}
            errorCode={form.errorCode}
            onSwitchToLogin={() => form.changeMode("login")}
          />

          <form
            onSubmit={form.handleSubmit}
            className={classes.form}
            noValidate
            aria-busy={submitting}
          >
            <Collapse expanded={isSignup}>
              <div className={classes.nameField}>
                <TextInput
                  id="name"
                  name="name"
                  label={
                    <>
                      이름 <span className={classes.optional}>(선택)</span>
                    </>
                  }
                  autoComplete="name"
                  maxLength={AUTH_NAME_MAX_LENGTH}
                  placeholder="여행자"
                  value={values.name}
                  disabled={submitting}
                  error={fieldError("name")}
                  onChange={(event) =>
                    form.changeField("name", event.currentTarget.value)
                  }
                  classNames={{ input: classes.input, label: classes.label }}
                />
              </div>
            </Collapse>

            <TextInput
              id="email"
              name="email"
              type="email"
              label="이메일"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={values.email}
              disabled={submitting}
              error={fieldError("email")}
              onChange={(event) =>
                form.changeField("email", event.currentTarget.value)
              }
              classNames={{ input: classes.input, label: classes.label }}
            />

            <PasswordInput
              id="password"
              name="password"
              mt="md"
              label="비밀번호"
              placeholder={
                isSignup
                  ? `${AUTH_PASSWORD_MIN_LENGTH}자 이상 입력해 주세요`
                  : "비밀번호"
              }
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              value={values.password}
              disabled={submitting}
              error={fieldError("password")}
              visible={showPassword}
              onVisibilityChange={form.setShowPassword}
              visibilityToggleIcon={({ reveal }) =>
                reveal ? (
                  <IconEyeOff size={20} aria-hidden="true" />
                ) : (
                  <IconEye size={20} aria-hidden="true" />
                )
              }
              visibilityToggleButtonProps={{
                "aria-label": showPassword
                  ? "비밀번호 숨기기"
                  : "비밀번호 보기",
                "aria-pressed": showPassword,
              }}
              onChange={(event) =>
                form.changeField("password", event.currentTarget.value)
              }
              classNames={{
                input: classes.input,
                label: classes.label,
                innerInput: classes.passwordInner,
                section: classes.passwordSection,
                visibilityToggle: classes.visibilityToggle,
              }}
            />
            <Collapse expanded={isSignup && !form.fieldErrors.password}>
              <p className={classes.passwordHint}>
                {AUTH_PASSWORD_MIN_LENGTH}자 이상
              </p>
            </Collapse>

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={submitting}
              className={classes.submitButton}
            >
              {submitting ? (
                "처리 중..."
              ) : (
                <span key={mode} className={classes.submitLabel}>
                  {isSignup ? "가입하고 시작하기" : "로그인"}
                </span>
              )}
            </Button>
          </form>

          <Divider
            label="또는"
            labelPosition="center"
            className={classes.divider}
          />

          <Button
            type="button"
            fullWidth
            variant="default"
            disabled={submitting}
            leftSection={<GoogleIcon />}
            onClick={form.handleGoogle}
            className={classes.googleButton}
          >
            Google로 계속하기
          </Button>

          <p className={classes.terms}>
            계속하면 <Link href="/terms">이용약관</Link> 및{" "}
            <Link href="/privacy">개인정보처리방침</Link>에 동의하는 것으로
            간주돼요.
          </p>
        </div>
      </section>
    </main>
  );
}
