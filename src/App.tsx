import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { loadPrefs, PREFS_EVENT } from "./lib/prefs";
import { GameProvider, useGame } from "./store/Game";
import { Header } from "./components/Header";
import { LoginView } from "./components/LoginView";
import { PendingView } from "./components/PendingView";
import { LiveTicker, FeedRail } from "./components/LiveFeed";
import { ChatRail } from "./components/ChatRail";
import { CasesView } from "./components/CasesView";
import { UpgraderView } from "./components/UpgraderView";
import { BattleView } from "./components/BattleView";
import { GamesView } from "./components/GamesView";
import { JackpotView } from "./components/JackpotView";
import { MarketView } from "./components/MarketView";
import { ShopView } from "./components/ShopView";
import { SeasonView } from "./components/SeasonView";
import { TradeView } from "./components/TradeView";
import { InventoryView } from "./components/InventoryView";
import { StatsView } from "./components/StatsView";
import { CommunityView } from "./components/CommunityView";
import { EventBanners } from "./components/EventBanners";
import { SupportChat } from "./components/SupportChat";
import { CasinoAmbience } from "./components/CasinoAmbience";
import { CelebrationOverlay } from "./components/CelebrationOverlay";
import { AdminPanel } from "./components/AdminPanel";
import { Toasts } from "./components/Toasts";
import { LiveToasts } from "./components/LiveToasts";
import { Footer } from "./components/Footer";

function Shell() {
  const { tab, user, isAdmin } = useGame();

  /* V2.0: seçili renk temasını <html> köküne uygula (login dahil her yer) */
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = loadPrefs().theme;
    };
    apply();
    window.addEventListener(PREFS_EVENT, apply);
    return () => window.removeEventListener(PREFS_EVENT, apply);
  }, []);

  /* giriş yapılmadıysa */
  if (!user) return <LoginView />;

  /* onay bekleyen / reddedilen */
  if (user.status !== "approved") {
    return (
      <>
        <PendingView />
        <Toasts />
      </>
    );
  }

  return (
    <div className="noise bg-site min-h-screen">
      <CasinoAmbience />
      <Header />
      <LiveTicker />
      <EventBanners />
      <FeedRail />
      <ChatRail />

      <main className="relative z-10 pb-16 lg:pb-0 xl:px-[292px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {tab === "cases" && <CasesView />}
            {tab === "upgrader" && <UpgraderView />}
            {tab === "battle" && <BattleView />}
            {tab === "games" && <GamesView />}
            {tab === "jackpot" && <JackpotView />}
            {tab === "market" && <MarketView />}
            {tab === "shop" && <ShopView />}
            {tab === "season" && <SeasonView />}
            {tab === "trade" && <TradeView />}
            {tab === "inventory" && <InventoryView />}
            {tab === "stats" && <StatsView />}
            {tab === "community" && <CommunityView />}
            {tab === "admin" && (isAdmin ? <AdminPanel /> : <CasesView />)}
          </motion.div>
        </AnimatePresence>
        <Footer />
      </main>

      <CelebrationOverlay />
      <Toasts />
      <LiveToasts />
      <SupportChat />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
