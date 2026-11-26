/** Foto redonda da pessoa ou a inicial do nome num círculo colorido. */
export function Avatar({ name, url, size = 40, className = "" }: { name: string; url: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário
    <img src={url} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span aria-label={name} style={{ ...style, fontSize: size * 0.42 }} className={`grid shrink-0 place-items-center rounded-full bg-lavender font-display font-extrabold text-on-color ${className}`}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
