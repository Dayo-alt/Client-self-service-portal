import { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Settings as SettingsIcon, BarChart3, Moon, Sun, Bell, Menu, Upload, ImageOff, FileEdit, Trash2, Plus } from "lucide-react";
import { getCurrentUser, signOutAdmin, db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp, getDocs, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTranslation } from "react-i18next";

type Invoice = {
  id?: string;
  userId: string;
  invoiceNumber: string;
  date: any;
  service: string;
  amount: number;
  status: string;
};

type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  userId?: string | null;
  createdAt?: any;
};

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const { t, i18n } = useTranslation();

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [currPwd, setCurrPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // Invoice admin state
  const [selectedUserInput, setSelectedUserInput] = useState(""); // can be email or UID
  const [selectedUserId, setSelectedUserId] = useState(""); // always UID
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({});
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Load theme preference
  useEffect(() => {
    const isDark =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Set page title
  useEffect(() => {
    document.title = `Admin - ${t("settings.title")}`;
  }, [t]);

  // Load profile data from Auth/Firestore
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = getCurrentUser();
      if (!u) return;
      if (mounted) {
        setDisplayName(u.displayName || "");
        setPhotoURL(u.photoURL || undefined);
      }
      try {
        const snap = await getDoc(doc(db, "admins", u.uid));
        if (snap.exists() && mounted) {
          const d = snap.data() as any;
          if (d?.displayName) setDisplayName(d.displayName);
          if (d?.photoURL) setPhotoURL(d.photoURL);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for invoices for selected user
  useEffect(() => {
    if (!selectedUserId) {
      setInvoices([]);
      return;
    }
    const qInv = query(collection(db, "invoices"), where("userId", "==", selectedUserId));
    const unsub = onSnapshot(qInv, (qs) => {
      const arr: Invoice[] = [];
      qs.forEach(docSnap => arr.push({ id: docSnap.id, ...docSnap.data() } as Invoice));
      setInvoices(arr);
    });
    return () => unsub();
  }, [selectedUserId]);

  // Listen for all contact submissions (descending by createdAt)
  useEffect(() => {
    const qContacts = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qContacts, (qs) => {
      const arr: Contact[] = [];
      qs.forEach(docSnap => arr.push({ id: docSnap.id, ...(docSnap.data() as any) }));
      setContacts(arr);
    });
    return () => unsub();
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  const handleLogout = async () => {
    try {
      await signOutAdmin();
      toast({ title: t("login.successTitle"), description: t("login.successDesc") });
      setLocation("/login");
    } catch (error: any) {
      toast({ title: t("login.failedTitle"), description: error.message || t("login.failedDesc"), variant: "destructive" });
    }
  };

  const onLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("lang", lng);
    } catch {}
  };

  const onPickAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoURL(String(ev.target?.result));
      reader.readAsDataURL(f);
    }
  };

  const saveProfile = async () => {
    const u = getCurrentUser();
    if (!u) {
      toast({ title: t("login.failedTitle"), description: t("login.failedDesc"), variant: "destructive" });
      return;
    }
    try {
      setSavingProfile(true);
      // Upload avatar if picked
      let finalPhotoURL = photoURL;
      if (avatarFile) {
        const path = `adminAvatars/${u.uid}/${Date.now()}_${avatarFile.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, avatarFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }
      // Update Auth profile
      await updateProfile(u, { displayName: displayName || undefined, photoURL: finalPhotoURL });
      // Persist to Firestore
      await setDoc(
        doc(db, "admins", u.uid),
        { displayName: displayName || null, photoURL: finalPhotoURL || null, updatedAt: Date.now() },
        { merge: true }
      );
      toast({ title: t("settings.profile"), description: t("settings.save") + " ✓" });
      setAvatarFile(null);
      setPhotoURL(finalPhotoURL);
    } catch (e: any) {
      toast({ title: t("settings.save"), description: e?.message || "", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    const u = getCurrentUser();
    if (!u) {
      toast({ title: t("login.failedTitle"), description: t("login.failedDesc"), variant: "destructive" });
      return;
    }
    if (!currPwd || !newPwd) {
      toast({ title: t("settings.changePassword"), description: t("settings.changePassword"), variant: "destructive" });
      return;
    }
    try {
      setChangingPwd(true);
      const cred = EmailAuthProvider.credential(u.email || "", currPwd);
      await reauthenticateWithCredential(u, cred);
      await updatePassword(u, newPwd);
      setCurrPwd("");
      setNewPwd("");
      toast({ title: t("settings.changePassword"), description: "✓" });
    } catch (e: any) {
      toast({ title: t("settings.changePassword"), description: e?.message || "", variant: "destructive" });
    } finally {
      setChangingPwd(false);
    }
  };

  // --- Invoice Admin Handlers ---

  // Helper: Get UID from email or return UID if already UID
  async function resolveUserId(input: string): Promise<string | null> {
    if (!input) return null;
    const trimmed = input.trim();

    // If looks like a UID (no @ and reasonably long), accept directly
    if (trimmed.length >= 20 && !trimmed.includes("@")) return trimmed;

    // Treat as email: try 'profiles' first (this app stores email there)
    try {
      const q1 = query(collection(db, "profiles"), where("email", "==", trimmed));
      const qs1 = await getDocs(q1);
      if (!qs1.empty) return qs1.docs[0].id;
    } catch {}

    // Fallback to a generic 'users' collection if you maintain one
    try {
      const q2 = query(collection(db, "users"), where("email", "==", trimmed));
      const qs2 = await getDocs(q2);
      if (!qs2.empty) return qs2.docs[0].id;
    } catch {}

    toast({ title: "User not found", description: "No user with this email.", variant: "destructive" });
    return null;
  }

  const handleUserIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.trim();
    setSelectedUserInput(input);
    setEditingInvoice(null);
    setInvoiceForm({});
    setInvoices([]);
    if (!input) {
      setSelectedUserId("");
      return;
    }
    const uid = await resolveUserId(input);
    if (uid) setSelectedUserId(uid);
    else setSelectedUserId("");
  };

  const handleInvoiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvoiceForm((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number(value) : value,
    }));
  };

  const handleInvoiceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceForm((prev) => ({
      ...prev,
      date: e.target.value,
    }));
  };

  const startEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date?.toDate ? inv.date.toDate().toISOString().slice(0, 10) : "",
      service: inv.service,
      amount: inv.amount,
      status: inv.status,
    });
    setShowInvoiceModal(true);
  };

  const cancelEditInvoice = () => {
    setEditingInvoice(null);
    setInvoiceForm({});
    setShowInvoiceModal(false);
  };

  const handleSaveInvoice = async () => {
    if (!selectedUserId) {
      toast({ title: "User ID required", description: "Enter a valid user email or UID to add/edit invoice", variant: "destructive" });
      return;
    }
    const { invoiceNumber, date, service, amount, status } = invoiceForm;
    if (!invoiceNumber || !date || !service || !amount || !status) {
      toast({ title: "All fields required", description: "Fill all invoice fields", variant: "destructive" });
      return;
    }
    try {
      if (editingInvoice && editingInvoice.id) {
        await updateDoc(doc(db, "invoices", editingInvoice.id), {
          invoiceNumber,
          date: Timestamp.fromDate(new Date(date as string)),
          service,
          amount,
          status,
        });
        toast({ title: "Invoice updated" });
      } else {
        await addDoc(collection(db, "invoices"), {
          userId: selectedUserId,
          invoiceNumber,
          date: Timestamp.fromDate(new Date(date as string)),
          service,
          amount,
          status,
        });
        toast({ title: "Invoice created!" });
      }
      setInvoiceForm({});
      setEditingInvoice(null);
      setShowInvoiceModal(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "", variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "invoices", id));
      toast({ title: "Invoice deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "contacts", id));
      toast({ title: "Contact deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "", variant: "destructive" });
    }
  };

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
              <h1 className="ml-3 text-xl font-semibold text-foreground">{t("common.admin")}</h1>
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
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
              data-testid="nav-tracking"
            >
              <Shield className="mr-3 w-4 h-4" />
              {t("common.tracking")}
            </a>
            <a
              href="#"
              onClick={() => setLocation("/settings")}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
              data-testid="nav-settings"
            >
              <SettingsIcon className="mr-3 w-4 h-4" />
              {t("common.settings")}
            </a>
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="avatar" className="w-8 h-8 object-cover" />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentUser?.displayName?.[0] || currentUser?.email?.[0] || "A"}
                  </span>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-foreground">{currentUser?.displayName || t("common.adminUser")}</p>
                <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t("common.signOut")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between bg-card border-b border-border px-4 shadow-sm">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden mr-2">
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-semibold text-foreground">{t("settings.title")}</h2>
          </div>

          <div className="flex items-center space-x-4">
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

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.profile")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={photoURL} />
                    <AvatarFallback>
                      <ImageOff className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label className="text-sm">{t("settings.avatar")}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="image/*" onChange={onPickAvatar} className="max-w-xs" />
                      <Button onClick={saveProfile} disabled={savingProfile}>
                        <Upload className="mr-2 w-4 h-4" /> {savingProfile ? t("common.signingIn") : t("settings.save")}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">{t("settings.displayName")}</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t("common.admin")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.security")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="currPwd">{t("settings.changePassword")}</Label>
                  <Input id="currPwd" type="password" value={currPwd} onChange={(e) => setCurrPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPwd">{t("settings.changePassword")}</Label>
                  <Input id="newPwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                </div>
                <Button onClick={changePassword} disabled={changingPwd}>
                  {changingPwd ? t("common.signingIn") : t("settings.changePassword")}
                </Button>
              </CardContent>
            </Card>

            {/* Preferences (Theme toggle summary) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t("settings.preferences")}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Button variant="outline" onClick={toggleTheme}>
                  {darkMode ? <Sun className="mr-2 w-4 h-4" /> : <Moon className="mr-2 w-4 h-4" />}
                  {t("common.themeToggle")} ({darkMode ? "Dark" : "Light"})
                </Button>
              </CardContent>
            </Card>

            {/* --- Invoice Admin Section --- */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Manage User Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <Input
                    placeholder="Enter User Email or UID to manage invoices"
                    value={selectedUserInput}
                    onChange={handleUserIdChange}
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingInvoice(null);
                      setInvoiceForm({});
                      setShowInvoiceModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Create New Invoice
                  </Button>
                </div>
                {(selectedUserId && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-2 py-1 border">Invoice #</th>
                          <th className="px-2 py-1 border">Date</th>
                          <th className="px-2 py-1 border">Service</th>
                          <th className="px-2 py-1 border">Amount</th>
                          <th className="px-2 py-1 border">Status</th>
                          <th className="px-2 py-1 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="border px-2 py-1">{inv.invoiceNumber}</td>
                            <td className="border px-2 py-1">{inv.date?.toDate ? inv.date.toDate().toLocaleDateString() : ""}</td>
                            <td className="border px-2 py-1">{inv.service}</td>
                            <td className="border px-2 py-1">{inv.amount}</td>
                            <td className="border px-2 py-1">{inv.status}</td>
                            <td className="border px-2 py-1 flex gap-2">
                              <Button size="icon" variant="ghost" onClick={() => startEditInvoice(inv)}>
                                <FileEdit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteInvoice(inv.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Invoice Modal */}
                {showInvoiceModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-lg">
                      <h3 className="text-lg font-bold mb-4">{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</h3>
                      <form
                        className="grid grid-cols-1 gap-3"
                        onSubmit={e => {
                          e.preventDefault();
                          handleSaveInvoice();
                        }}
                      >
                        <Input
                          name="invoiceNumber"
                          placeholder="Invoice #"
                          value={invoiceForm.invoiceNumber || ""}
                          onChange={handleInvoiceFormChange}
                          required
                        />
                        <Input
                          name="date"
                          type="date"
                          placeholder="Date"
                          value={invoiceForm.date || ""}
                          onChange={handleInvoiceDateChange}
                          required
                        />
                        <Input
                          name="service"
                          placeholder="Service"
                          value={invoiceForm.service || ""}
                          onChange={handleInvoiceFormChange}
                          required
                        />
                        <Input
                          name="amount"
                          type="number"
                          placeholder="Amount"
                          value={invoiceForm.amount || ""}
                          onChange={handleInvoiceFormChange}
                          required
                        />
                        <select
                          name="status"
                          value={invoiceForm.status || ""}
                          onChange={handleInvoiceFormChange}
                          className="border border-border rounded-md px-2 py-1"
                          required
                        >
                          <option value="">Status</option>
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                        <div className="flex gap-2">
                          <Button type="submit" variant="default">
                            {editingInvoice ? "Update" : "Create"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEditInvoice}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* --- Contacts Admin Section --- */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Contact Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-2 py-1 border">Name</th>
                        <th className="px-2 py-1 border">Email</th>
                        <th className="px-2 py-1 border">Message</th>
                        <th className="px-2 py-1 border">User</th>
                        <th className="px-2 py-1 border">Created</th>
                        <th className="px-2 py-1 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id}>
                          <td className="border px-2 py-1">{c.name}</td>
                          <td className="border px-2 py-1">{c.email}</td>
                          <td className="border px-2 py-1 max-w-[420px] whitespace-pre-wrap">{c.message}</td>
                          <td className="border px-2 py-1">{c.userId || "-"}</td>
                          <td className="border px-2 py-1">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ""}</td>
                          <td className="border px-2 py-1">
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteContact(c.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}