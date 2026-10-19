import type { Branding } from "@/lib/branding";
import {
  BRAND_CYAN,
  BRAND_CYAN_ON_TILE,
  BRAND_MARK_BODY,
  BRAND_MARK_STROKE,
  BRAND_MARK_TAIL,
  isVoceroName,
} from "@/lib/brand";
import { faviconHref, faviconInitial } from "@/lib/favicon";
import { cn } from "@/lib/utils";

const isNovagente = (name: string) => name.toUpperCase().includes("NOVAGENTE");

/**
 * Lo que la marca necesita para dibujarse: el nombre, el acento y si hay
 * logo subido (el acento entra en la URL versionada del icono generado).
 */
export type BrandingMark = Pick<Branding, "name" | "accent" | "favicon">;

/**
 * El trazo de la marca: la "v" caligráfica con remate cian de vocerocrm.com.
 * El cuerpo hereda `currentColor`; píntalo con `text-brand` (o blanco sobre el
 * mosaico) y el remate sigue siendo cian.
 */
export function BrandMark({
  className,
  cyan = BRAND_CYAN,
}: {
  className?: string;
  cyan?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d={BRAND_MARK_BODY}
        stroke="currentColor"
        strokeWidth={BRAND_MARK_STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={BRAND_MARK_TAIL}
        stroke={cyan}
        strokeWidth={BRAND_MARK_STROKE}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Mosaico cuadrado con degradado del acento: es el favicon en grande. Con un
 * logo subido lleva el logo (el MISMO archivo y la MISMA URL versionada que
 * la pestaña, así lo que se sube en Ajustes → Marca se ve en los dos sitios);
 * sin él, la "v" de Vocero o la inicial del nombre white-label.
 */
export function BrandTile({
  branding,
  className,
}: {
  branding: BrandingMark;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "brand-tile flex shrink-0 items-center justify-center overflow-hidden text-brand-fg",
        className
      )}
      aria-hidden
    >
      {branding.favicon ? (
        // Sin next/image a propósito: es un archivo de una ruta propia, ya
        // pequeño; pasarlo por el optimizador sería trabajo para no ahorrar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconHref(branding)}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : isNovagente(branding.name) ? (
        <svg viewBox="0 0 40 40" className="h-[75%] w-[75%]" fill="none" aria-hidden>
          <path d="M10 29V11L30 29V11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="31" cy="8" r="3" fill="#a6ebcb"/>
        </svg>
      ) : isVoceroName(branding.name) ? (
        <BrandMark className="h-[64%] w-[64%]" cyan={BRAND_CYAN_ON_TILE} />
      ) : (
        <span className="font-bold leading-none">{faviconInitial(branding.name)}</span>
      )}
    </span>
  );
}

const WORDMARK_SIZE = {
  md: "text-[21px]",
  lg: "text-[30px]",
} as const;

const MARK_SIZE = {
  md: "h-[24px] w-[24px]",
  lg: "h-[34px] w-[34px]",
} as const;

const TILE_SIZE = {
  md: "h-[30px] w-[30px] rounded-[9px] text-[15px]",
  lg: "h-[44px] w-[44px] rounded-[13px] text-[22px]",
} as const;

/**
 * La marca completa, como en la cabecera de la landing: trazo + wordmark
 * "vocero" en minúsculas y bien apretado. Una instancia rebautizada ve en su
 * lugar el mosaico con la inicial y su nombre (white-label). Con logo subido
 * gana el logo, se llame como se llame: quien sube un archivo quiere verlo.
 */
export function BrandLogo({
  branding,
  size = "md",
  className,
}: {
  branding: BrandingMark;
  size?: keyof typeof WORDMARK_SIZE;
  className?: string;
}) {
  if (isNovagente(branding.name)) {
    return (
      <span className={cn("flex min-w-0 items-center gap-2.5 text-foreground", className)}>
        <BrandTile branding={branding} className={cn(TILE_SIZE[size], "rounded-xl")} />
        <span className="flex min-w-0 flex-col justify-center gap-0.5 leading-none">
          <span className={cn("font-semibold uppercase tracking-[0.2em] text-text-3", size === "lg" ? "text-[11px]" : "text-[8px]")}>
            PAINEL
          </span>
          <span className={cn("font-[850] tracking-[-0.035em]", size === "lg" ? "text-[26px]" : "text-[18px]")}>
            NOVAGENTE
          </span>
        </span>
      </span>
    );
  }
  if (isVoceroName(branding.name) && !branding.favicon) {
    return (
      <span className={cn("flex items-center gap-2 text-foreground", className)}>
        <BrandMark className={cn("shrink-0 text-brand", MARK_SIZE[size])} />
        <span
          className={cn(
            "font-[800] leading-none tracking-[-0.045em]",
            WORDMARK_SIZE[size]
          )}
        >
          vocero
        </span>
      </span>
    );
  }
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandTile branding={branding} className={TILE_SIZE[size]} />
      <span
        className={cn(
          "truncate font-[750] leading-none tracking-tight",
          size === "lg" ? "text-[26px]" : "text-[17px]"
        )}
      >
        {branding.name}
      </span>
    </span>
  );
}
