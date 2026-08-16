import { onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/**
 * เฝ้าดูเอกสาร users/{uid} ของผู้ใช้ที่ล็อกอินอยู่แบบเรียลไทม์
 * ถ้า admin ลบบัญชีนี้ หรือเปลี่ยน "ตำแหน่ง" (role) ไปเป็นอย่างอื่นระหว่างที่ยังค้างอยู่ในหน้านี้
 * ระบบจะเด้งออก (sign out + redirect) ทันที ไม่ต้องรอ refresh หรือ login ใหม่
 *
 * @param {Object} opts
 * @param {import("firebase/auth").Auth} opts.auth
 * @param {import("firebase/firestore").Firestore} opts.db
 * @param {import("firebase/auth").User} opts.user   - ผู้ใช้ที่ล็อกอินอยู่ตอนนี้ (จาก onAuthStateChanged)
 * @param {string} opts.expectedRole                  - role ที่หน้านี้ต้องการ ("customer" | "technician" | "admin")
 * @param {(data:object)=>void} [opts.onData]          - เรียกทุกครั้งที่ข้อมูลถูกต้อง (รวมถึงครั้งแรกที่โหลด) ไว้ใช้แทน getDoc ครั้งเดียว
 * @param {string} [opts.redirectTo]                   - หน้าที่จะพาไปหลังถูกเด้ง (ค่าเริ่มต้น "login.html")
 * @returns {Function} ฟังก์ชันสำหรับ unsubscribe
 */
export function watchAccountGuard({ auth, db, user, expectedRole, onData, redirectTo = "login.html" }) {
  let kicked = false;
  let unsub = () => {};

  async function kick(title, text) {
    if (kicked) return;
    kicked = true;
    try { unsub(); } catch (e) {}

    try {
      if (typeof Swal !== "undefined") {
        await Swal.fire({
          icon: "warning",
          title,
          text,
          allowOutsideClick: false,
          confirmButtonText: "ตกลง"
        });
      }
    } finally {
      try { await signOut(auth); } catch (e) {}
      window.location.href = redirectTo;
    }
  }

  unsub = onSnapshot(
    doc(db, "users", user.uid),
    (snap) => {
      if (kicked) return;

      if (!snap.exists()) {
        kick("บัญชีถูกลบ", "บัญชีของคุณถูกผู้ดูแลระบบลบออกจากระบบ คุณจะถูกออกจากระบบทันที");
        return;
      }

      const data = snap.data();

      if (expectedRole && data.role !== expectedRole) {
        kick("สิทธิ์การใช้งานถูกเปลี่ยนแปลง", "ตำแหน่งของบัญชีของคุณถูกผู้ดูแลระบบเปลี่ยน กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        return;
      }

      if (onData) onData(data);
    },
    (error) => {
      console.error("account-guard onSnapshot error:", error);
    }
  );

  return () => { kicked = true; unsub(); };
}
