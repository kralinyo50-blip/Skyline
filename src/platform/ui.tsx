import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { X, PackageOpen, LoaderCircle, ShieldCheck } from "lucide-react";
import { SKIN_MAP } from "../data/skins";
import { STICKER_MAP } from "../data/stickers";
import { usePlatform, navigate } from "./context";
import type { OnlineItem, StickerDesign } from "../../shared/platform";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      {...props}
      className={`pf-button pf-button--${variant} ${className}`}
    >
      {children}
    </button>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`pf-panel ${className}`}>{children}</section>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="pf-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="pf-empty">
      <PackageOpen size={36} />
      <h3>{title}</h3>
      {children && <div>{children}</div>}
    </div>
  );
}
export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "green" | "amber" | "red";
}) {
  return <span className={`pf-tag pf-tag--${tone}`}>{children}</span>;
}
export function Title({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pf-page-title">
      <div>
        <p className="pf-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="pf-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="pf-modal"
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pf-modal-head">
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" onClick={onClose} aria-label="Kapat">
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function SkinImage({
  catalogId,
  image,
  alt,
  className = "",
}: {
  catalogId?: string | null;
  image?: string | null;
  alt: string;
  className?: string;
}) {
  const src =
    image ||
    (catalogId ? SKIN_MAP[catalogId]?.img || STICKER_MAP[catalogId]?.img : "");
  return (
    <div className={`pf-skin-image ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : (
        <PackageOpen size={48} />
      )}
    </div>
  );
}
export function ItemArt({ item }: { item: OnlineItem }) {
  return (
    <SkinImage
      catalogId={item.catalogId}
      image={item.image}
      alt={`${item.weapon} ${item.name}`}
    />
  );
}
export function StickerArt({ value }: { value: StickerDesign }) {
  const gradient = useId().replace(/:/g, "");
  const paths = {
    circle: "M50 5a45 45 0 1 0 0 90a45 45 0 1 0 0-90",
    shield: "M50 5L90 20V55Q88 80 50 96Q12 80 10 55V20Z",
    diamond: "M50 4L96 50L50 96L4 50Z",
    hexagon: "M27 7H73L97 50L73 93H27L3 50Z",
  };
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={value.text}
      className="pf-sticker"
    >
      <defs>
        <linearGradient id={gradient} x2="1" y2="1">
          <stop stopColor={value.color} />
          <stop offset="1" stopColor={value.gradient} />
        </linearGradient>
      </defs>
      <path
        d={paths[value.shape] || paths.circle}
        fill={`url(#${gradient})`}
        stroke="#fff"
        strokeOpacity=".6"
        strokeWidth="2"
      />
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={value.text.length > 10 ? 8 : 13}
        fontWeight="800"
      >
        {value.text}
      </text>
    </svg>
  );
}
export function AuthGate({ children }: { children: ReactNode }) {
  const { data, connected } = usePlatform();
  if (!connected)
    return (
      <Empty title="Sunucu bağlantısı gerekli">
        Bu bölümdeki işlemler yalnızca güvenli sunucuda yapılır.
      </Empty>
    );
  if (!data?.user)
    return (
      <Empty title="Güvenli hesabına giriş yap">
        <p>V2 kullanıcı adın tek başına ödeme yetkisi vermez.</p>
        <Button onClick={() => navigate("account")}>Hesap merkezine git</Button>
      </Empty>
    );
  if (data.user.status !== "approved")
    return (
      <Empty title="Hesabın onay bekliyor">
        <p>Yetkili onayından sonra üretim, pazar ve canlı odalar açılır.</p>
        <Button onClick={() => navigate("account")}>Yedek ve aktarım</Button>
      </Empty>
    );
  return <>{children}</>;
}
export function BusyLabel({ children }: { children: ReactNode }) {
  const { busy } = usePlatform();
  return (
    <>
      {busy && <LoaderCircle size={16} className="pf-spin" />}
      {children}
    </>
  );
}
export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="pf-safety">
      <ShieldCheck size={19} />
      <span>{children}</span>
    </div>
  );
}
export function timeLeft(at: number, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((at - now) / 1000));
  if (seconds >= 3600)
    return `${Math.floor(seconds / 3600)} sa ${Math.floor((seconds % 3600) / 60)} dk`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} dk ${seconds % 60} sn`;
  return `${seconds} sn`;
}
