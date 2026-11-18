import { LoginForm } from "./login-form";

// ?next= comes from the URL, so it is untrusted. It is only passed on to the form;
// the login action checks it with safeRedirectPath before redirecting.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : ""} />;
}
