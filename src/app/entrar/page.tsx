import { BrandMark } from "@/components/brand/mark";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-stage pt-safe text-stage-ink">
      <div className="flex flex-1 flex-col justify-end gap-3 px-gutter pb-10">
        <BrandMark className="size-14" />
        <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em]">Oi de novo.</h1>
        <p className="text-[19px] font-semibold leading-snug tracking-tight text-stage-muted">
          Entre para ver o que <span className="text-stage-ink">o seu dia</span> e o de vocês dois têm hoje.
        </p>
      </div>
      <div className="rounded-t-[28px] bg-bg px-gutter pb-safe pt-6 text-ink">
        <LoginForm />
      </div>
    </main>
  );
}
