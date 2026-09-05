/** V2 raffle data and deterministic reward receipts. No storage writes on read. */
export const MAX_SKIN_RAFFLE_PRIZES = 20;

export interface RaffleSkinOptions {
  float?: number;
  stickers?: string[];
}

export interface RaffleSkinSelection {
  skinId: string;
  skinOpts?: RaffleSkinOptions;
}

export interface RaffleSkinPrize extends RaffleSkinSelection {
  skinName?: string;
}

export interface RaffleState {
  id: string;
  prize: number;
  endsAt: number;
  startedBy: string;
  drawn?: boolean;
  cancelled?: boolean;
  winner?: { key: string; name: string; ts: number };
  participants?: Record<string, { name: string; ts: number }>;
  /** Ordered reward package: every entry goes to the same winner. */
  skinPrizes?: RaffleSkinPrize[];
  /** Legacy single-skin fields, retained for old records/clients. */
  skinId?: string;
  skinName?: string;
  skinOpts?: RaffleSkinOptions;
}

type PrizeSource = Pick<
  RaffleState,
  "skinPrizes" | "skinId" | "skinName" | "skinOpts"
>;
type PrizeSkin = {
  id: string;
  weapon: string;
  name: string;
  sticker?: boolean;
};

export function copyRaffleSkin(prize: RaffleSkinPrize): RaffleSkinPrize {
  return {
    skinId: prize.skinId,
    skinName: prize.skinName,
    skinOpts: prize.skinOpts
      ? {
          float: prize.skinOpts.float,
          stickers: prize.skinOpts.stickers
            ? [...prize.skinOpts.stickers]
            : undefined,
        }
      : undefined,
  };
}

/** A package is authoritative; its legacy first-skin alias is not an extra prize. */
export function raffleSkins(raffle?: PrizeSource | null): RaffleSkinPrize[] {
  if (raffle?.skinPrizes?.length) return raffle.skinPrizes.map(copyRaffleSkin);
  if (!raffle?.skinId) return [];
  return [
    copyRaffleSkin({
      skinId: raffle.skinId,
      skinName: raffle.skinName,
      skinOpts: raffle.skinOpts,
    }),
  ];
}

export function raffleSkinLabel(raffle?: PrizeSource | null): string | null {
  const prizes = raffleSkins(raffle);
  if (!prizes.length) return null;
  return prizes.length === 1
    ? prizes[0].skinName || prizes[0].skinId
    : `${prizes.length} skinlik ödül paketi`;
}

/** Validate the entire selection before replacing any raffle; copy mutable options. */
export function prepareRaffleSkins(
  selections: readonly RaffleSkinSelection[],
  lookup: (id: string) => PrizeSkin | undefined,
  isSticker: (id: string) => boolean,
): { ok: true; prizes: RaffleSkinPrize[] } | { ok: false; error: string } {
  if (!Array.isArray(selections) || !selections.length)
    return { ok: false, error: "En az bir ödül skini seç." };
  if (selections.length > MAX_SKIN_RAFFLE_PRIZES) {
    return {
      ok: false,
      error: `Bir çekilişte en fazla ${MAX_SKIN_RAFFLE_PRIZES} skin seçebilirsin.`,
    };
  }
  const prizes: RaffleSkinPrize[] = [];
  for (const selection of selections) {
    const skin =
      selection && typeof selection.skinId === "string"
        ? lookup(selection.skinId)
        : undefined;
    if (!skin || skin.id !== selection.skinId || skin.sticker)
      return {
        ok: false,
        error: "Seçilen ödüllerden biri geçerli bir skin değil.",
      };
    const opts = selection.skinOpts;
    const fine: RaffleSkinOptions = {};
    if (typeof opts?.float === "number" && Number.isFinite(opts.float)) {
      fine.float = Math.min(
        1,
        Math.max(0, Math.round(opts.float * 1000) / 1000),
      );
    }
    if (Array.isArray(opts?.stickers)) {
      const stickers = opts.stickers
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && isSticker(id),
        )
        .slice(0, 4);
      if (stickers.length) fine.stickers = stickers;
    }
    prizes.push({
      skinId: skin.id,
      skinName: `${skin.weapon} | ${skin.name}`,
      skinOpts: Object.keys(fine).length ? fine : undefined,
    });
  }
  return { ok: true, prizes };
}

/** Older clients may echo only the first-skin fields; do not lose the full package. */
export function mergeRafflePrizes(
  local: RaffleState,
  remote: RaffleState,
): RaffleState {
  if (
    local.id !== remote.id ||
    local.skinPrizes?.length ||
    !remote.skinPrizes?.length
  )
    return local;
  const prizes = remote.skinPrizes.map(copyRaffleSkin);
  return { ...local, skinPrizes: prizes, ...copyRaffleSkin(prizes[0]) };
}

export interface RafflePayout extends Partial<RaffleSkinPrize> {
  id: string;
  userKey: string;
  userName: string;
  amount: number;
  method: string;
  status: "approved";
  ts: number;
  decidedTs: number;
  decidedBy: string;
}

/** Keep the old first-reward receipt ID. Extra skins each get their own stable ID. */
export function rafflePayouts(
  raffle: RaffleState,
  now: number,
): RafflePayout[] {
  if (!raffle.drawn || raffle.cancelled || !raffle.winner?.key) return [];
  const winner = raffle.winner;
  const base = {
    userKey: winner.key,
    userName: winner.name,
    status: "approved" as const,
    ts: now,
    decidedTs: now,
    decidedBy: "Sistem",
  };
  const prizes = raffleSkins(raffle);
  if (!prizes.length) {
    return [
      {
        ...base,
        id: `raffle:${raffle.id}`,
        amount: raffle.prize,
        method: "Çekiliş Ödülü",
      },
    ];
  }
  return prizes.map((prize, index) => ({
    ...base,
    ...copyRaffleSkin(prize),
    id:
      index === 0 ? `raffle:${raffle.id}` : `raffle:${raffle.id}:skin:${index}`,
    amount: 0,
    method: "Skin Çekilişi Ödülü",
  }));
}

/** Used on draw and for a package finalized by an older single-skin client. */
export function missingRafflePayouts(
  raffle: RaffleState,
  deposits: readonly { id: string; userKey: string }[],
  now: number,
) {
  const expected = rafflePayouts(raffle, now);
  const existing = new Map(deposits.map((deposit) => [deposit.id, deposit]));
  // Never overwrite another recipient or split a disputed draw across winners.
  if (
    expected.some(
      (reward) =>
        existing.has(reward.id) &&
        existing.get(reward.id)!.userKey !== reward.userKey,
    )
  )
    return [];
  return expected.filter((reward) => !existing.has(reward.id));
}
