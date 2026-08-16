// ==========================================================================
// Admin chat widget — ใช้ร่วมกันทุกหน้าแอดมิน (admin.html / admin-repair.html / admin-users.html)
// คุยกับลูกค้าที่ไม่ล็อกอิน (ห้อง chats/visitor-{เบอร์หรือUUID}) แบบเรียลไทม์
// ต้องการ HTML: #openChat, #chatPopup (wide), #chatContacts, #chatWithName,
//              #chatActions, #openCaseFromChat, #chatBody, #messageInput, #sendBtn, #closeChat, #indToast
// ==========================================================================
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, onSnapshot, query, orderBy, addDoc, setDoc, doc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let adminName = "แอดมิน";
let chatThreads = [];
let activeRoomId = null;
let activeVisitor = null;
let unsubMessages = null;
let chatThreadsLoaded = false;

const openChatBtn = document.getElementById("openChat");
const closeChatBtn = document.getElementById("closeChat");
const chatPopup = document.getElementById("chatPopup");
const chatContacts = document.getElementById("chatContacts");
const chatWithName = document.getElementById("chatWithName");
const chatActions = document.getElementById("chatActions");
const openCaseBtn = document.getElementById("openCaseFromChat");
const chatBody = document.getElementById("chatBody");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

function toast(msg) {
  const el = document.getElementById("indToast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

openChatBtn.addEventListener("click", () => chatPopup.classList.add("show"));
closeChatBtn.addEventListener("click", () => chatPopup.classList.remove("show"));

onAuthStateChanged(auth, (user) => {
  if (!user) return; // หน้าแอดมินมี guard ของตัวเอง เด้งไป login.html อยู่แล้ว

  // ดึงชื่อจริงของแอดมินไว้แสดงในแชทฝั่งลูกค้า
  getDoc(doc(db, "users", user.uid))
    .then((snap) => {
      if (snap.exists() && snap.data().fullname) adminName = snap.data().fullname;
    })
    .catch(() => {});

  loadChatThreads();
});

// รายชื่อห้องแชท: วอล์กอิน (visitor) + ลูกค้ามีบัญชี (customer) — ห้องเคสแบบเก่า (chats/{caseId}) ไม่แสดง
function loadChatThreads() {
  onSnapshot(collection(db, "chats"), (snapshot) => {
    chatThreads = snapshot.docs
      .map((d) => ({ roomId: d.id, ...d.data() }))
      .filter((t) => t.roomType === "customer" || t.roomType === "visitor" || t.visitorName || t.visitorPhone);

    if (chatThreadsLoaded) {
      snapshot.docChanges().forEach((change) => {
        const c = change.doc.data();
        const name = c.visitorName || c.customerName;
        const phone = c.visitorPhone || c.customerPhone;
        if ((change.type === "added" || change.type === "modified") &&
            (c.roomType === "customer" || c.roomType === "visitor" || c.visitorName) &&
            c.lastSenderRole === "customer") {
          toast(`${name || "ลูกค้า"}${phone ? " (" + phone + ")" : ""} ทักแชทเข้ามา`);
        }
      });
    }
    chatThreadsLoaded = true;

    renderChatContacts();
  }, (err) => {
    console.error("[chats onSnapshot error]", err);
    chatContacts.innerHTML = `<div class="notif-empty">โหลดรายชื่อไม่สำเร็จ: ${err.code || err.message}</div>`;
  });
}

function renderChatContacts() {
  const sorted = [...chatThreads].sort((a, b) =>
    (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0)
  );

  if (sorted.length === 0) {
    chatContacts.innerHTML = `<div class="notif-empty">ยังไม่มีแชทจากลูกค้า</div>`;
    return;
  }

  chatContacts.innerHTML = sorted.map((t) => {
    const name = t.visitorName || t.customerName || "ลูกค้า";
    const phone = t.visitorPhone || t.customerPhone;
    return `
    <div class="chat-contact-item ${activeRoomId === t.roomId ? "active" : ""}" onclick="openChatThread('${t.roomId}')">
      <div class="cname">
        ${t.lastSenderRole === "customer" ? '<span class="chat-contact-dot"></span>' : ""}
        ${name}
        ${t.roomType === "customer" ? '<span class="role-tag" style="font-size:.55rem;color:var(--yellow);border:1px solid var(--yellow);border-radius:20px;padding:0 .35rem;">บัญชี</span>' : ""}
        ${phone ? `<span class="text-muted" style="font-weight:400;font-size:.72rem;">${phone}</span>` : ""}
        ${t.caseNo ? `<span class="text-muted" style="font-weight:400;font-size:.68rem;">· ${t.caseNo}</span>` : ""}
      </div>
      <div class="clast">${t.lastMessage || "ยังไม่มีข้อความ"}</div>
    </div>
  `;
  }).join("");
}

window.openChatThread = (roomId) => {
  const t = chatThreads.find((x) => x.roomId === roomId);
  if (!t) return;

  activeRoomId = roomId;
  activeVisitor = { name: t.visitorName || t.customerName, phone: t.visitorPhone || t.customerPhone, uid: t.customerUid || null };
  const name = activeVisitor.name || "ลูกค้า";
  chatWithName.innerHTML = `<i class="fa-solid fa-headset"></i> ${name}${activeVisitor.phone ? ` (${activeVisitor.phone})` : ""}${t.caseNo ? ` <span class="text-muted" style="font-weight:400;font-size:.72rem;">· ${t.caseNo}</span>` : ""}`;
  chatActions.style.display = "block";
  messageInput.disabled = false;
  sendBtn.disabled = false;
  renderChatContacts();

  if (unsubMessages) unsubMessages();
  unsubMessages = onSnapshot(
    query(collection(db, "chats", roomId, "messages"), orderBy("createdAt", "asc")),
    (snapshot) => {
      chatBody.innerHTML = snapshot.docs.map((d) => {
        const m = d.data();
        const cls = m.senderRole === "admin" ? "user" : "tech";
        return `<div class="msg ${cls}">${m.text || ""}</div>`;
      }).join("") || `<div class="notif-empty">เริ่มต้นการสนทนากับ ${t.visitorName || "ลูกค้า"}</div>`;
      chatBody.scrollTop = chatBody.scrollHeight;
    },
    (err) => {
      console.error("[โหลดข้อความแชทไม่สำเร็จ]", err);
      chatBody.innerHTML = `<div class="notif-empty">โหลดข้อความไม่สำเร็จ (${err.code || err.message})</div>`;
    }
  );
};

// ปุ่ม "เปิดเคสใหม่ให้ลูกค้ารายนี้" — หน้าอื่นนอกจาก admin-repair ให้เด้งไปหน้า Repair Cases
openCaseBtn.addEventListener("click", () => {
  if (typeof window.prepareCreateCase === "function") {
    window.prepareCreateCase(activeVisitor?.name || "", activeVisitor?.phone || "", activeRoomId, activeVisitor?.uid || "");
  } else {
    toast("ไปที่หน้า 'จัดการงานซ่อม' เพื่อเปิดเคสให้ลูกค้ารายนี้");
  }
});

async function sendAdminMessage() {
  const text = messageInput.value.trim();
  if (text === "" || !activeRoomId) return;
  messageInput.value = "";

  try {
    await addDoc(collection(db, "chats", activeRoomId, "messages"), {
      text,
      senderRole: "admin",
      senderName: adminName,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "chats", activeRoomId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastSenderRole: "admin",
    }, { merge: true });
  } catch (err) {
    console.error("[ส่งแชทไม่สำเร็จ]", err);
    toast("ส่งไม่สำเร็จ: " + (err.code || err.message));
    messageInput.value = text;
  }
}

sendBtn.addEventListener("click", sendAdminMessage);
messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendAdminMessage(); });
