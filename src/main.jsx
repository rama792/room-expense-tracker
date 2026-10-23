import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp,
  setDoc, query, orderBy, limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Wallet, Users, Plus, ArrowUpRight, ReceiptText, Copy, Check,
  LogIn, DoorOpen, Sparkles, CalendarDays, Tag, CircleDollarSign,
  ShieldCheck, ChevronDown, Trash2, X, Info, RefreshCw
} from "lucide-react";
import { configured, auth, db, signInAnonymously } from "./firebase";
import "./styles.css";

const money = (n) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(n || 0));

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)))
  .map((n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("");

function App() {
  const [uid, setUid] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [name, setName] = useState(localStorage.getItem("roomie_name") || "");
  const [roomName, setRoomName] = useState("My Room");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState(localStorage.getItem("roomie_room") || "");
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [date, setDate] = useState(localDate());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [demoExpenses, setDemoExpenses] = useState([
    { id:"d1", title:"Milk & bread", amount:48, category:"Groceries", payerName:"You", payerUid:"demo", date:localDate(), createdAt:{seconds:Date.now()/1000} },
    { id:"d2", title:"Dishwashing liquid", amount:85, category:"Household", payerName:"Rahul", payerUid:"demo2", date:localDate(), createdAt:{seconds:Date.now()/1000-3600} },
    { id:"d3", title:"Tea & snacks", amount:120, category:"Food", payerName:"Aman", payerUid:"demo3", date:localDate(), createdAt:{seconds:Date.now()/1000-7200} },
    { id:"d4", title:"Water can", amount:35, category:"Utilities", payerName:"Rohit", payerUid:"demo4", date:localDate(), createdAt:{seconds:Date.now()/1000-10800} }
  ]);

  useEffect(() => {
    if (!configured) { setAuthReady(true); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        try {
          const credential = await signInAnonymously(auth);
          setUid(credential.user.uid);
        } catch (error) {
          setNotice(`Firebase sign-in failed: ${error.message}`);
        }
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!configured || !uid || !roomCode) return;
    let stopRoom = () => {};
    let stopMembers = () => {};
    let stopExpenses = () => {};
    stopRoom = onSnapshot(doc(db, "rooms", roomCode), (snap) => {
      if (!snap.exists()) {
        setNotice("Room not found. Check the invite code.");
        setRoom(null);
        return;
      }
      setRoom({ id: snap.id, ...snap.data() });
      setNotice("");
    }, (error) => setNotice(`Room access error: ${error.message}`));
    stopMembers = onSnapshot(collection(db, "rooms", roomCode, "members"), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => setNotice(`Members error: ${error.message}`));
    stopExpenses = onSnapshot(query(collection(db, "rooms", roomCode, "expenses"), orderBy("createdAt", "desc"), limit(200)), (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => setNotice(`Expenses error: ${error.message}`));
    return () => { stopRoom(); stopMembers(); stopExpenses(); };
  }, [uid, roomCode]);

  const activeExpenses = configured ? expenses : demoExpenses;
  const activeMembers = configured ? members : [
    { id:"demo", name:"You" }, { id:"demo2", name:"Rahul" },
    { id:"demo3", name:"Aman" }, { id:"demo4", name:"Rohit" }
  ];
  const total = activeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const myTotal = activeExpenses.filter((e) => configured ? e.payerUid === uid : e.payerName === "You")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const memberTotals = useMemo(() => activeMembers.map((member) => ({
    ...member,
    total: activeExpenses.filter((e) => e.payerUid === member.id)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  })), [activeMembers, activeExpenses]);
  const todayTotal = activeExpenses.filter((e) => e.date === localDate())
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const saveName = (value) => {
    setName(value);
    localStorage.setItem("roomie_name", value);
  };

  async function createRoom(e) {
    e?.preventDefault();
    if (!name.trim()) return setNotice("Enter your name first.");
    if (!configured) return setNotice("Demo mode: add your Firebase config in src/firebase.js to create a real shared room.");
    setBusy(true);
    try {
      const code = makeCode();
      await setDoc(doc(db, "rooms", code), {
        name: roomName.trim() || "My Room", createdBy: uid, createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "rooms", code, "members", uid), {
        name: name.trim(), joinedAt: serverTimestamp(), role: "owner"
      });
      localStorage.setItem("roomie_room", code);
      setRoomCode(code);
      setPage("overview");
      setNotice("");
    } catch (error) {
      setNotice(`Could not create room: ${error.message}`);
    } finally { setBusy(false); }
  }

  async function joinRoom(e) {
    e?.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!name.trim()) return setNotice("Enter your name first.");
    if (!code) return setNotice("Enter the room invite code.");
    if (!configured) return setNotice("Demo mode: add your Firebase config in src/firebase.js to join a real shared room.");
    setBusy(true);
    try {
      const roomRef = doc(db, "rooms", code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) throw new Error("Room code not found. Ask your roommate for the invite code.");
      await setDoc(doc(db, "rooms", code, "members", uid), {
        name: name.trim(), joinedAt: serverTimestamp(), role: "member"
      });
      localStorage.setItem("roomie_room", code);
      setRoomCode(code);
      setPage("overview");
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    } finally { setBusy(false); }
  }

  async function addExpense(e) {
    e.preventDefault();
    if (!item.trim() || !amount || Number(amount) <= 0) return setNotice("Enter an item name and a valid amount.");
    if (!configured) {
      setDemoExpenses((old) => [{ id: crypto.randomUUID(), title:item.trim(), amount:Number(amount), category, payerName:name.trim() || "You", payerUid:"demo", date, createdAt:{seconds:Date.now()/1000} }, ...old]);
    } else {
      if (!roomCode || !uid) return setNotice("Create or join a room first.");
      setBusy(true);
      try {
        await addDoc(collection(db, "rooms", roomCode, "expenses"), {
          title: item.trim(), amount: Number(amount), category, date,
          payerUid: uid, payerName: name.trim() || "Roommate",
          createdAt: serverTimestamp()
        });
      } catch (error) {
        setNotice(`Could not save expense: ${error.message}`);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setItem(""); setAmount(""); setCategory("Groceries"); setDate(localDate()); setShowAdd(false); setNotice("");
  }

  function leaveRoom() {
    localStorage.removeItem("roomie_room");
    setRoomCode(""); setRoom(null); setExpenses([]); setMembers([]);
    setPage("overview"); setNotice("You left this room on this device. The room data was not deleted.");
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { setNotice(`Share this invite code: ${roomCode}`); }
  }

  if (!authReady) return <div className="loading"><div className="brand-mark"><Wallet /></div><h2>Opening your room…</h2></div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Wallet size={22}/></div><span>roomie<span className="brand-dot">.</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className={`nav-item ${page === "overview" ? "active" : ""}`} onClick={() => setPage("overview")}><span className="nav-icon"><Sparkles size={18}/></span> Overview</button>
        <button className={`nav-item ${page === "expenses" ? "active" : ""}`} onClick={() => setPage("expenses")}><span className="nav-icon"><ReceiptText size={18}/></span> All expenses <span className="nav-count">{activeExpenses.length}</span></button>
        <button className={`nav-item ${page === "members" ? "active" : ""}`} onClick={() => setPage("members")}><span className="nav-icon"><Users size={18}/></span> Roommates</button>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><ShieldCheck size={17}/></div><strong>Your room, your records</strong><p>Each purchase is saved under the person who added it.</p></div>
          <div className="profile"><div className="avatar avatar-you">{(name || "Y").charAt(0).toUpperCase()}</div><div className="profile-copy"><strong>{name || "Your profile"}</strong><span>{configured ? "Anonymous secure session" : "Interactive demo mode"}</span></div><ChevronDown size={16} className="muted"/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{room?.name || "Room overview"}</strong></div>
          <div className="top-actions">
            <span className={`connection-pill ${configured ? "cloud" : "demo"}`}><span className="status-dot"></span>{configured ? "Cloud sync" : "Demo preview"}</span>
            {roomCode && <button className="icon-button" title="Leave room on this device" onClick={leaveRoom}><DoorOpen size={18}/></button>}
          </div>
        </header>

        <div className="content">
          {!configured && <div className="demo-banner"><Info size={18}/><div><strong>You're exploring demo mode.</strong> Entries work in this browser. Add Firebase config to enable real shared rooms and live cloud sync.</div></div>}
          {notice && <div className="notice"><Info size={17}/><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}

          {!roomCode ? (
            <section className="welcome-layout">
              <div className="welcome-copy">
                <div className="eyebrow"><span className="eyebrow-line"></span> SHARED LIVING, SIMPLIFIED</div>
                <h1>Room expenses.<br/><em>Zero confusion.</em></h1>
                <p className="lead">Keep track of every little purchase — from ₹20 milk to the monthly water can. Everyone's spending, all in one place.</p>
                <div className="feature-row"><div className="feature-icon"><Users size={17}/></div><span>One room · Every roommate · Clear records</span></div>
              </div>
              <div className="entry-card">
                <div className="card-kicker">GET STARTED</div>
                <h2>Welcome to roomie</h2>
                <p className="subtle">No phone number or separate password needed.</p>
                <label className="field-label" htmlFor="your-name">Your name</label>
                <input id="your-name" value={name} onChange={(e) => saveName(e.target.value)} placeholder="e.g. Ankit" maxLength="40"/>
                <div className="form-divider"><span>START A ROOM</span></div>
                <form onSubmit={createRoom}>
                  <label className="field-label" htmlFor="room-name">Room name</label>
                  <input id="room-name" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Sector 62 Flat" maxLength="50"/>
                  <button className="button-primary full" disabled={busy}><Plus size={17}/>{busy ? "Please wait…" : "Create a new room"}</button>
                </form>
                <div className="form-divider"><span>OR JOIN YOUR ROOM</span></div>
                <form onSubmit={joinRoom}>
                  <label className="field-label" htmlFor="invite-code">Invite code</label>
                  <div className="input-with-icon"><LogIn size={17}/><input id="invite-code" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="e.g. K8M4P2QX" maxLength="12"/></div>
                  <button className="button-secondary full" disabled={busy}>Join room <ArrowUpRight size={17}/></button>
                </form>
                <div className="privacy-note"><ShieldCheck size={15}/> No phone number required. A private anonymous session identifies this browser.</div>
              </div>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div><div className="eyebrow"><span className="eyebrow-line"></span> YOUR SHARED SPACE</div><h1>{room?.name || "Room overview"}</h1><p className="subtle">Your daily spending, organized without the awkward reminders.</p></div>
                <button className="button-primary" onClick={() => setShowAdd(true)}><Plus size={18}/> Add expense</button>
              </div>
              <div className="room-code-strip"><div className="room-code-icon"><Users size={19}/></div><div className="room-code-copy"><strong>Room invite code</strong><span>Share this with your roommates to let them join.</span></div><code>{roomCode}</code><button className="copy-button" onClick={copyCode}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Copied" : "Copy"}</button></div>
              <section className="stats-grid">
                <div className="stat-card stat-primary"><div className="stat-top"><span>Total room spending</span><div className="stat-icon"><Wallet size={18}/></div></div><div className="stat-value">{money(total)}</div><div className="stat-foot"><span className="mini-dot"></span> All recorded purchases</div><div className="stat-watermark"><Wallet size={88}/></div></div>
                <div className="stat-card"><div className="stat-top"><span>Added by you</span><div className="stat-icon soft"><CircleDollarSign size={18}/></div></div><div className="stat-value">{money(myTotal)}</div><div className="stat-foot"><span className="green-text">Your contribution</span></div></div>
                <div className="stat-card"><div className="stat-top"><span>Spent today</span><div className="stat-icon soft"><CalendarDays size={18}/></div></div><div className="stat-value">{money(todayTotal)}</div><div className="stat-foot"><span>Across the whole room</span></div></div>
                <div className="stat-card"><div className="stat-top"><span>Roommates</span><div className="stat-icon soft"><Users size={18}/></div></div><div className="stat-value">{activeMembers.length}<small> people</small></div><div className="stat-foot"><span>{configured ? "Live room members" : "Demo members"}</span></div></div>
              </section>

              <div className="section-grid">
                <section className="panel expenses-panel">
                  <div className="panel-heading"><div><h2>{page === "expenses" ? "All expenses" : "Recent expenses"}</h2><p>Every purchase, accounted for.</p></div><button className="text-button" onClick={() => setPage("expenses")}>View all <ArrowUpRight size={15}/></button></div>
                  {activeExpenses.length === 0 ? <div className="empty-state"><div className="empty-icon"><ReceiptText size={24}/></div><strong>No expenses yet</strong><span>Add the first item bought for your room.</span><button className="button-secondary" onClick={() => setShowAdd(true)}><Plus size={16}/> Add first expense</button></div> : (
                    <div className="expense-list">{(page === "expenses" ? activeExpenses : activeExpenses.slice(0,5)).map((expense) => {
                      const initial = (expense.payerName || "?").charAt(0).toUpperCase();
                      return <div className="expense-row" key={expense.id}><div className={`category-icon ${expense.category?.toLowerCase().replace(/[^a-z]/g,"") || "other"}`}><Tag size={18}/></div><div className="expense-main"><strong>{expense.title}</strong><span>{expense.category || "Other"} <i>·</i> {expense.date || "Date not set"}</span></div><div className="payer"><div className="avatar small-avatar">{initial}</div><span>{expense.payerUid === uid ? "You" : (expense.payerName || "Roommate")}</span></div><strong className="expense-amount">{money(expense.amount)}</strong></div>;
                    })}</div>
                  )}
                </section>

                <section className="panel members-panel">
                  <div className="panel-heading"><div><h2>Roommates</h2><p>Individual spending totals</p></div><span className="member-count">{activeMembers.length}</span></div>
                  <div className="member-list">{memberTotals.map((member, i) => <div className="member-row" key={member.id}><div className={`avatar member-avatar avatar-${i % 4}`}>{(member.name || "?").charAt(0).toUpperCase()}</div><div className="member-details"><strong>{member.id === uid ? `${member.name || name || "You"} (you)` : member.name || "Roommate"}</strong><div className="member-progress"><span style={{width: `${total ? Math.max(3, member.total / total * 100) : 0}%`}}></span></div></div><div className="member-amount">{money(member.total)}</div></div>)}</div>
                  <div className="members-foot"><ShieldCheck size={16}/><span>Each expense is credited to its payer.</span></div>
                </section>
              </div>
              <div className="bottom-note"><Info size={16}/><span>This app tracks <strong>who paid for what</strong>. It does not split bills or calculate who owes whom.</span></div>
            </>
          )}
        </div>
        <footer className="footer"><span>roomie<span className="brand-dot">.</span> <i>made for shared living</i></span><span><span className="footer-dot"></span>{configured ? "Firebase cloud database" : "Local demo data"}</span></footer>
      </main>

      {showAdd && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowAdd(false)}><div className="modal">
        <div className="modal-heading"><div><div className="card-kicker">NEW RECORD</div><h2>Add an expense</h2><p className="subtle">Add the amount you personally paid for a room item.</p></div><button className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close"><X size={19}/></button></div>
        <form onSubmit={addExpense} className="expense-form">
          <label className="field-label" htmlFor="item">What did you buy?</label><input id="item" autoFocus value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Milk, bread, cleaning supplies" maxLength="100" required/>
          <label className="field-label" htmlFor="amount">Amount (₹)</label><div className="amount-input"><span>₹</span><input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required/></div>
          <div className="two-fields"><div><label className="field-label" htmlFor="category">Category</label><select id="category" value={category} onChange={(e) => setCategory(e.target.value)}><option>Groceries</option><option>Food</option><option>Household</option><option>Utilities</option><option>Rent</option><option>Other</option></select></div><div><label className="field-label" htmlFor="date">Purchase date</label><input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required/></div></div>
          <div className="payer-preview"><div className="avatar avatar-you">{(name || "Y").charAt(0).toUpperCase()}</div><div><strong>Paid by {name || "you"}</strong><span>This expense will be added to your personal total.</span></div></div>
          <button className="button-primary full" disabled={busy}><Plus size={17}/>{busy ? "Saving…" : "Save expense"}</button>
        </form>
      </div></div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
