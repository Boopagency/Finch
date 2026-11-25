import { BrandMark } from "@/components/brand/mark";
import { findValidInvite } from "@/features/core/server/invite-lookup";
import { AcceptForm } from "./accept-form";

export const metadata = { title: "Convite" };

export default async function InvitePage({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const invite = await findValidInvite(token);

  return (
    <main className="flex min-h-dvh flex-col bg-stage pt-safe text-stage-ink">
      <div className="flex flex-1 flex-col justify-end gap-3 px-gutter pb-10">
        <BrandMark className="size-14" />
        {invite ? (
          <>
            <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.04em]">
              {invite.inviterName} te chamou.
            </h1>
            <p className="text-[19px] font-semibold leading-snug tracking-tight text-stage-muted">
              Vocês vão dividir <span className="text-stage-ink">{invite.workspaceName}</span> no Finch. O que é seu continua só seu.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.04em]">Convite inválido.</h1>
            <p className="text-[19px] font-semibold leading-snug tracking-tight text-stage-muted">
              Ele expirou, foi revogado ou já foi usado. Peça um link novo.
            </p>
          </>
        )}
      </div>
      {invite && (
        <div className="rounded-t-[28px] bg-bg px-gutter pb-safe pt-6 text-ink">
          <AcceptForm token={token} email={invite.email} />
        </div>
      )}
    </main>
  );
}
