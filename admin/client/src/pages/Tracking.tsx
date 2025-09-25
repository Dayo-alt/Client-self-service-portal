import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Settings, BarChart3, Moon, Sun, Bell, Menu } from "lucide-react";
import { getCurrentUser, signOutAdmin, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

export default function Tracking() {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const { t, i18n } = useTranslation();

  // Tickets and selection
  type Ticket = {
    id: string;
    email: string;
    subject: string;
    category?: string;
    desc?: string;
    fileName?: string;
    statusIndex: number;
    createdAt?: any;
  };
  const statuses = ["Opened", "In Progress", "Awaiting Technical Support", "Resolved"];
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ from: string; msg: string; ts?: any }>>([]);
  const [newMsg, setNewMsg] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Load theme preference
  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Set page title
  useEffect(() => {
    document.title = "Admin - Tracking";
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  const onLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try { localStorage.setItem("lang", lng); } catch { }
  };

  const handleLogout = async () => {
    try {
      await signOutAdmin();
      toast({
        title: t("Logged Out"),
        description: t("You have been successfully logged out."),
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: t("Logout Failed"),
        description: error.message || t("Failed to log out."),
        variant: "destructive",
      });
    }
  };

  // Subscribe to all tickets in real-time
  useEffect(() => {
    setTicketsLoading(true);
    setTicketsError(null);
    const qAll = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qAll,
      (qs) => {
        const arr: Ticket[] = qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setTickets(arr);
        setTicketsLoading(false);
        // if currently selected was removed, clear selection
        if (selectedId && !arr.find((t) => t.id === selectedId)) {
          setSelectedId(null);
          setMessages([]);
        }
      },
      (err) => {
        console.error("Failed to load tickets:", err);
        setTicketsError(err?.message || "Failed to load tickets");
        setTicketsLoading(false);
        toast({ title: t("Failed to load tickets"), description: err?.message || t("An error occurred"), variant: "destructive" });
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to messages for selected ticket
  useEffect(() => {
    if (!selectedId) return;
    setMessagesLoading(true);
    setMessagesError(null);
    const qMsgs = query(collection(db, "tickets", selectedId, "messages"), orderBy("ts", "asc"));
    const unsub = onSnapshot(
      qMsgs,
      (qs) => {
        const arr = qs.docs.map((d) => d.data() as any);
        setMessages(arr);
        setMessagesLoading(false);
      },
      (err) => {
        console.error("Failed to load messages:", err);
        setMessagesError(err?.message || "Failed to load messages");
        setMessagesLoading(false);
        toast({ title: t("Failed to load messages"), description: err?.message || t("An error occurred"), variant: "destructive" });
      }
    );
    return () => unsub();
  }, [selectedId, toast, t]);

  const selectTicket = async (id: string) => {
    setSelectedId(id);
    // Ensure status is at least Opened (0) when admin opens a ticket
    try {
      const tkt = tickets.find((x) => x.id === id);
      if (tkt && (tkt.statusIndex === undefined || tkt.statusIndex < 0)) {
        await updateDoc(doc(db, "tickets", id), { statusIndex: 0 });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (nextIndex: number) => {
    if (!selectedId) return;
    try {
      await updateDoc(doc(db, "tickets", selectedId), { statusIndex: nextIndex });
      toast({ title: t("Status updated"), description: statuses[nextIndex] });
    } catch (e: any) {
      toast({ title: t("Failed to update status"), description: e.message, variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!selectedId || !newMsg.trim()) return;
    try {
      await addDoc(collection(db, "tickets", selectedId, "messages"), {
        from: "admin",
        msg: newMsg.trim(),
        ts: serverTimestamp(),
      });
      setNewMsg("");
    } catch (e: any) {
      toast({ title: t("Failed to send message"), description: e.message, variant: "destructive" });
    }
  };

  const selected = selectedId ? tickets.find((t) => t.id === selectedId) : null;
  const statusIndex = selected?.statusIndex ?? 0;
  const progressPercent = (statusIndex / (statuses.length - 1)) * 100;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-4 border-b border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-foreground">Admin</h1>
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            <a
              href="#"
              onClick={() => setLocation("/dashboard")}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
            >
              <BarChart3 className="mr-3 w-4 h-4" />
              {t("common.dashboard")}
            </a>
            <a
              href="#"
              onClick={() => setLocation("/tracking")}
              className="bg-accent text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              data-testid="nav-tracking"
            >
              <Shield className="mr-3 w-4 h-4" />
              {t("common.tracking")}
            </a>
            <a
              href="#"
              onClick={() => setLocation("/settings")}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
            >
              <Settings className="mr-3 w-4 h-4" />
              {t("common.settings")}
            </a>
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0] || "A"}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {currentUser?.displayName || "Admin User"}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("common.signOut")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between bg-card border-b border-border px-4 shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-semibold text-foreground">{t("tracking.title")}</h2>
          </div>

          <div className="flex items-center space-x-2">
            <select
              aria-label="Language"
              onChange={onLangChange}
              value={i18n.language}
              className="border border-border rounded-md bg-background text-foreground text-sm px-2 py-1"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="ar">العربية</option>
              <option value="ja">日本語</option>
            </select>
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Ticket Management */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets list */}
            <section className="lg:col-span-1 bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t("tracking.incomingTickets")}</h3>
              <div className="space-y-2 max-h-[70vh] overflow-auto">
                {ticketsLoading && (
                  <div className="text-sm text-muted-foreground">Loading tickets...</div>
                )}
                {ticketsError && (
                  <div className="text-sm text-destructive">{ticketsError}</div>
                )}
                {!ticketsLoading && !ticketsError && tickets.length === 0 && (
                  <div className="text-sm text-muted-foreground">No tickets yet</div>
                )}
                {tickets.map((tkt) => (
                  <button
                    key={tkt.id}
                    onClick={() => selectTicket(tkt.id)}
                    className={`w-full text-left border rounded-md p-3 transition-colors ${selectedId === tkt.id ? "bg-accent/50 border-accent" : "border-border hover:bg-accent/20"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground truncate mr-2">{tkt.subject || "(No subject)"}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">
                        {statuses[tkt.statusIndex] || "Unknown"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{tkt.email} • {tkt.category}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Details and actions */}
            <section className="lg:col-span-2 space-y-4">
              {/* Status Tracker */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Status Tracker</h3>
                  {selected && (
                    <div className="text-xs text-muted-foreground">Ticket ID: {selected.id}</div>
                  )}
                </div>
                {/* Steps */}
                <div className="flex items-center gap-4">
                  {statuses.map((s, i) => (
                    <div key={s} className="flex-1 min-w-0 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold ${i < statusIndex
                            ? "bg-green-500 text-white border-green-600"
                            : i === statusIndex
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-foreground border-border"
                          }`}
                      >
                        {i + 1}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground text-center truncate w-full">{s}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-1 bg-muted rounded">
                  <div
                    className="h-1 bg-primary rounded transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {/* Controls */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={!selected} variant="secondary" onClick={() => updateStatus(0)}>
                    Opened
                  </Button>
                  <Button disabled={!selected} onClick={() => updateStatus(1)}>
                    In Progress
                  </Button>
                  <Button disabled={!selected} variant="outline" onClick={() => updateStatus(2)}>
                    Awaiting Technical Support
                  </Button>
                  <Button disabled={!selected} variant="destructive" onClick={() => updateStatus(3)}>
                    Resolved
                  </Button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="bg-card border border-border rounded-lg p-4 h-[50vh] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{t("tracking.conversation")}</h3>
                  {selected && <div className="text-xs text-muted-foreground">{selected.email}</div>}
                </div>
                <div className="flex-1 overflow-auto space-y-2 pr-1">
                  {!selected && (
                    <div className="text-sm text-muted-foreground">{t("tracking.selectTicket")}</div>
                  )}
                  {selected && messagesLoading && (
                    <div className="text-sm text-muted-foreground">Loading messages...</div>
                  )}
                  {selected && messagesError && (
                    <div className="text-sm text-destructive">{messagesError}</div>
                  )}
                  {selected && !messagesLoading && !messagesError && messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">No messages yet</div>
                  )}
                  {selected && !messagesLoading && !messagesError && messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${m.from === "admin"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : m.from === "bot"
                            ? "bg-muted text-foreground"
                            : "bg-accent/30 text-foreground"
                        }`}
                    >
                      {m.msg}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground outline-none"
                    placeholder="Type a reply..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    disabled={!selected}
                  />
                  <Button onClick={sendMessage} disabled={!selected || !newMsg.trim()}>
                    {t("tracking.send")}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
