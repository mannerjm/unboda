import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getSafeReturnTo } from "@/app/lib/auth";
import { recordServiceAnalyticsEvent } from "@/app/lib/analytics/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createClient } from "@/app/lib/supabase/server";
import {
  isSignupPolicyComplete,
  recordSignupPolicyAcceptance,
  SignupPolicyAcceptanceError,
} from "@/app/lib/signupPolicy/server";
import { SIGNUP_POLICIES } from "@/app/lib/signupPolicy/config";
import { completeNewSignupWithEvidence } from "@/app/lib/signupPolicy/signupService";
import { createAdminClient } from "@/app/lib/supabase/admin";

type SignupRequest = {
  email?: unknown;
  password?: unknown;
  termsAccepted?: unknown;
  age14OrOlderConfirmed?: unknown;
  returnTo?: unknown;
  captchaToken?: unknown;
};

function invalidRequest(message: string) {
  return NextResponse.json({ code: "SIGNUP_REQUEST_INVALID", error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  let body: SignupRequest;
  try {
    body = await request.json() as SignupRequest;
  } catch {
    return invalidRequest("가입 요청을 확인하지 못했습니다.");
  }

  if (body.termsAccepted !== true || body.age14OrOlderConfirmed !== true) {
    return invalidRequest("만 14세 확인과 이용약관 동의가 모두 필요합니다.");
  }

  const safeReturnTo = getSafeReturnTo(typeof body.returnTo === "string" ? body.returnTo : undefined);
  const currentUser = await getCurrentUser();
  const captchaRequired = process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true";

  if (
    !currentUser
    && captchaRequired
    && (typeof body.captchaToken !== "string" || !body.captchaToken.trim())
  ) {
    return invalidRequest("보안 확인을 완료해 주세요.");
  }

  try {
    let userId = currentUser?.id;
    let emailVerified = false;
    let createdNewSignup = false;

    if (userId) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      emailVerified = Boolean(data.user?.email_confirmed_at);
    } else {
      if (typeof body.email !== "string" || typeof body.password !== "string" || !body.email || !body.password) {
        return invalidRequest("이메일과 비밀번호를 입력해 주세요.");
      }

      const signupAttemptId = randomUUID();
      const signup = await completeNewSignupWithEvidence({
        email: body.email,
        password: body.password,
        signupAttemptId,
        signUp: async ({ email, password, signupAttemptId: attemptId }) => {
          const supabase = await createClient();
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { signupAttemptId: attemptId },
              emailRedirectTo: `${request.nextUrl.origin}/auth/callback?signupPolicy=required&returnTo=${encodeURIComponent(safeReturnTo)}`,
              captchaToken: captchaRequired && typeof body.captchaToken === "string"
                ? body.captchaToken
                : undefined,
            },
          });
          return { user: data.user, error };
        },
        getAuthoritativeUser: async (userId) => {
          const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
          return error ? null : data.user;
        },
        recordEvidence: async (userId) => {
          await recordSignupPolicyAcceptance(userId, {
            termsAccepted: true,
            termsVersion: SIGNUP_POLICIES.TERMS.version,
            age14OrOlderConfirmed: true,
            agePolicyVersion: SIGNUP_POLICIES.AGE_14_PLUS.version,
          });
        },
      });

      if (signup.status === "AUTH_FAILED") {
        return NextResponse.json({ code: "SIGNUP_AUTH_FAILED", error: "가입에 실패했습니다." }, { status: 400 });
      }
      if (signup.status === "IDENTITY_AMBIGUOUS") {
        return NextResponse.json({ code: "SIGNUP_IDENTITY_AMBIGUOUS", error: "이미 가입된 계정이거나 가입 상태를 확인할 수 없습니다. 로그인 또는 이메일 인증을 진행해 주세요." }, { status: 409 });
      }

      userId = signup.user.id;
      emailVerified = Boolean(signup.user.email_confirmed_at);
      createdNewSignup = true;
    }

    if (currentUser) {
      await recordSignupPolicyAcceptance(userId, {
        termsAccepted: true,
        termsVersion: SIGNUP_POLICIES.TERMS.version,
        age14OrOlderConfirmed: true,
        agePolicyVersion: SIGNUP_POLICIES.AGE_14_PLUS.version,
      });
    }

    const policyComplete = await isSignupPolicyComplete(userId);
    if (createdNewSignup && policyComplete) {
      await recordServiceAnalyticsEvent({ eventName: "SIGNUP_COMPLETED" });
    }

    return NextResponse.json({ policyComplete, emailVerified, returnTo: safeReturnTo });
  } catch (error) {
    if (error instanceof SignupPolicyAcceptanceError) {
      return NextResponse.json({ code: "SIGNUP_POLICY_INCOMPLETE", error: "가입 정책 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }
    return NextResponse.json({ code: "SIGNUP_FAILED", error: "가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
