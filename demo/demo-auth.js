export const DEMO_CREDENTIALS = Object.freeze({
  username: "demo",
  password: "scriverse-demo",
  captchaAnswer: "2468"
});

export function isValidDemoLogin(input) {
  return input?.username === DEMO_CREDENTIALS.username
    && input?.password === DEMO_CREDENTIALS.password
    && input?.captchaId === "demo-captcha"
    && String(input?.captchaAnswer ?? "").trim() === DEMO_CREDENTIALS.captchaAnswer;
}
