import { PRIVATE_HEADERS, RESET_API_PATH, RESET_TARGET_EMAIL, type ResetGrant } from "./bPasswordReset";

// Standalone document: no application analytics, tracking SDK, or PWA scripts.
// User input is never sent in a URL or stored in local/session storage.
export function resetPage(grant: ResetGrant, nonce: string): Response {
  const deadline = new Date(grant.expiresAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>B 계정 비밀번호 재설정 · 운보다 staging</title>
<style nonce="${nonce}">
*{box-sizing:border-box}body{margin:0;background:#f5f7fc;color:#171b33;font-family:system-ui,-apple-system,sans-serif;line-height:1.6}main{max-width:520px;margin:7vh auto;padding:24px}.tag{display:inline-block;background:#eeebff;color:#5b45bd;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:700}h1{font-size:28px;line-height:1.35;margin:22px 0 12px}p{color:#606981;font-size:14px}.card{margin-top:24px;background:white;border:1px solid #dfe3ef;border-radius:22px;padding:28px;box-shadow:0 10px 35px #24234d08}.email{font-size:16px;font-weight:700;color:#252c4b;overflow-wrap:anywhere}label{display:block;margin-top:20px;font-size:14px;font-weight:700}input{display:block;width:100%;margin-top:8px;padding:13px;border:1px solid #cdd4e5;border-radius:10px;font:inherit;outline:none}input:focus{border-color:#745fe7;box-shadow:0 0 0 4px #745fe720}button,a.button{display:block;width:100%;margin-top:24px;border:0;border-radius:11px;background:#6c53d8;padding:14px;color:white;text-align:center;text-decoration:none;font-size:15px;font-weight:700;cursor:pointer}button:disabled{opacity:.5;cursor:wait}.hint{font-size:12px;margin:7px 0;color:#70788c}#message{margin-top:16px;padding:12px;border-radius:9px;background:#fff2f0;color:#9b2929;font-size:14px}#success{border-left:3px solid #6c53d8;padding-left:16px}h2{font-size:21px;margin:0 0 10px}[hidden]{display:none!important}.foot{font-size:12px;text-align:center;margin-top:20px;color:#717a91}
</style></head><body><main>
<span class="tag">STAGING · 테스트 계정 B</span>
<h1>B 계정 비밀번호 재설정</h1><p>기존 계정과 연결된 프로필을 유지하며 비밀번호만 변경합니다.</p>
<section class="card"><p class="hint">변경할 계정</p><div class="email">${RESET_TARGET_EMAIL}</div>
<form id="reset-form" method="post" action="${RESET_API_PATH}">
<label for="new-password">새 비밀번호<input id="new-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label>
<p class="hint">12자 이상으로 입력해 주세요. 영문·숫자·기호를 함께 사용하면 좋습니다.</p>
<label for="confirm-password">새 비밀번호 확인<input id="confirm-password" name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label>
<p id="message" role="alert" hidden></p><button id="save" type="submit">B 비밀번호 변경</button>
</form><div id="success" role="status" hidden><h2>비밀번호 변경 완료</h2><p>B 계정의 새 비밀번호가 저장되었습니다. 새 비밀번호로 로그인해 주세요.</p><p id="signout-note" hidden>관리자 로그아웃을 완료하지 못했습니다. 로그인 화면에서 B 계정으로 전환해 주세요.</p><a class="button" href="/auth/login?returnTo=%2Faccount">B 계정으로 로그인</a></div>
</section><p class="foot">승인된 관리자 로그인 확인됨<br>입력 가능: ${deadline} (한국 시간)까지</p>
<noscript><p>안전한 변경을 위해 JavaScript를 켜 주세요. 이 화면에서는 일반 폼 전송이 차단됩니다.</p></noscript>
</main><script nonce="${nonce}">
(() => {
  const form = document.getElementById('reset-form');
  const password = document.getElementById('new-password');
  const confirmation = document.getElementById('confirm-password');
  const message = document.getElementById('message');
  const save = document.getElementById('save');
  let busy = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    message.hidden = true;
    if (password.value !== confirmation.value) {
      message.textContent = '두 비밀번호가 일치하지 않습니다.'; message.hidden = false; return;
    }
    if (new TextEncoder().encode(password.value).length > 72) {
      message.textContent = '비밀번호가 너무 깁니다. 더 짧게 입력해 주세요.'; message.hidden = false; return;
    }
    busy = true; save.disabled = true; save.textContent = '변경 중…';
    let body = JSON.stringify({password: password.value, confirmation: confirmation.value});
    password.value = ''; confirmation.value = '';
    try {
      const pending = fetch('${RESET_API_PATH}', {method:'POST', credentials:'same-origin', cache:'no-store', redirect:'error', headers:{'Content-Type':'application/json','X-Unboda-Staging-B-Reset':'1'}, body});
      body = '';
      const response = await pending;
      const result = await response.json();
      if (!response.ok || result.changed !== true) {
        message.textContent = result.error || '변경 결과를 확인하지 못했습니다. 관리자에게 상태 확인을 요청해 주세요.';
        message.hidden = false;
        if ([401,403,404,409,410].includes(response.status)) {
          password.disabled = true; confirmation.disabled = true; return;
        }
        return;
      }
      form.hidden = true; document.getElementById('success').hidden = false;
      document.getElementById('signout-note').hidden = result.operatorSignedOut === true;
    } catch {
      message.textContent = '변경 결과가 불확실합니다. 재시도하기 전에 관리자에게 상태 확인을 요청해 주세요.';
      message.hidden = false; password.disabled = true; confirmation.disabled = true;
    } finally {
      body = ''; busy = false;
      save.disabled = password.disabled; save.textContent = 'B 비밀번호 변경';
    }
  });
  window.addEventListener('pagehide', () => { password.value = ''; confirmation.value = ''; });
})();
</script></body></html>`;
  return new Response(html, { headers: {
    ...PRIVATE_HEADERS, "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  } });
}
