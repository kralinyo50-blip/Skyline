import { money } from "../config";
import { SKIN_MAP } from "../data/skins";
import { raffleSkins, type RaffleState } from "../store/raffle";

export function rafflePrizeLabel(raffle: RaffleState): string {
  const prizes = raffleSkins(raffle);
  if (!prizes.length) return money(raffle.prize);
  if (prizes.length > 1) return `${prizes.length} skinlik ödül paketi`;
  const prize = prizes[0],
    skin = SKIN_MAP[prize.skinId];
  return (
    prize.skinName || (skin ? `${skin.weapon} | ${skin.name}` : prize.skinId)
  );
}

/** All rewards remain visible, including old single-skin raffles. */
export function RafflePrizes({ raffle }: { raffle: RaffleState }) {
  const prizes = raffleSkins(raffle);
  if (!prizes.length) return null;
  return (
    <ul
      aria-label="Çekiliş skin ödülleri"
      className="tiny-scroll mt-3 grid max-h-64 gap-2 overflow-y-auto"
    >
      {prizes.map((prize, index) => {
        const skin = SKIN_MAP[prize.skinId];
        const name =
          prize.skinName ||
          (skin ? `${skin.weapon} | ${skin.name}` : prize.skinId);
        return (
          <li
            key={`${index}:${prize.skinId}`}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-ink-950/40 px-3 py-2"
          >
            {skin && (
              <img
                src={skin.img}
                alt={name}
                loading="lazy"
                className="h-12 w-12 shrink-0 object-contain"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="break-words text-xs font-bold text-white/80">
                {index + 1}. {name}
              </div>
              <div className="mt-1 text-[10px] text-white/45">
                {skin?.st ? "StatTrak™ · " : skin?.sv ? "Hatıra · " : ""}
                {typeof prize.skinOpts?.float === "number"
                  ? `Float ${prize.skinOpts.float.toFixed(3)}`
                  : "Rastgele aşınma"}
                {!!prize.skinOpts?.stickers?.length &&
                  ` · ${prize.skinOpts.stickers.length} sticker`}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
