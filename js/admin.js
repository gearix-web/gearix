import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc,
  collection,
  onSnapshot,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { watchAccountGuard } from "./account-guard.js";

// ตรวจสอบ Admin

let adminLoaded = false;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  // เฝ้าดูบัญชีของตัวเองแบบเรียลไทม์:
  // ถ้าถูกลบบัญชี หรือถูกเปลี่ยนตำแหน่งออกจาก "admin" ระหว่างที่ยังอยู่ในหน้านี้ -> เด้งออกทันที
  watchAccountGuard({
    auth, db, user,
    expectedRole: "admin",
    onData: () => {
      if (!adminLoaded) {
        adminLoaded = true;
        loadUsers();
        loadCases();
      }
    },
  });
});

// โหลด Users realtime

function loadUsers() {
  const table = document.getElementById("userTable");

  onSnapshot(collection(db, "users"), (snapshot) => {
    table.innerHTML = "";

    let users = 0;
    let tech = 0;
    let customer = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      users++;
      if (data.role === "technician") tech++;
      if (data.role === "customer") customer++;

      table.innerHTML += `
<tr>
<td>${data.fullname ?? "-"}</td>
<td>${data.email ?? "-"}</td>
<td>
<select
class="form-select"
onchange="changeRole('${docSnap.id}',this.value)"
>
<option value="customer" ${data.role === "customer" ? "selected" : ""}>customer</option>
<option value="technician" ${data.role === "technician" ? "selected" : ""}>technician</option>
<option value="admin" ${data.role === "admin" ? "selected" : ""}>admin</option>
</select>
</td>
<td>
<button
class="btn btn-danger btn-sm"
onclick="removeUser('${docSnap.id}')">
ลบ
</button>
</td>
</tr>
`;
    });

    document.getElementById("userCount").innerHTML = users;
    document.getElementById("techCount").innerHTML = tech;

    const customerEl = document.getElementById("customerCount");
    if (customerEl) customerEl.innerHTML = customer;
  });
}

// โหลด Case

function loadCases() {
  onSnapshot(collection(db, "repair_cases"), (snapshot) => {
    document.getElementById("caseCount").innerHTML = snapshot.size;
  });
}

// เปลี่ยน Role

window.changeRole = async (uid, role) => {
  try {
    await updateDoc(doc(db, "users", uid), { role: role });

    Swal.fire({
      icon: "success",
      title: "เปลี่ยนตำแหน่งเรียบร้อย",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: error.message,
    });
  }
};

// ลบ User

window.removeUser = async (uid) => {
  const result = await Swal.fire({
    title: "ลบบัญชีผู้ใช้?",
    text: "ข้อมูลของสมาชิกรายนี้จะถูกลบออกจากระบบ",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
  });

  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "users", uid));

    Swal.fire({
      icon: "success",
      title: "ลบบัญชีแล้ว",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: error.message,
    });
  }
};

// Logout

document.getElementById("logout").onclick = () => {
  signOut(auth).then(() => {
    location.href = "login.html";
  });
};

// ไฮไลต์เมนูปัจจุบันใน sidebar
document.querySelectorAll(".sidebar a").forEach((a) => {
  if (a.getAttribute("href") === location.pathname.split("/").pop()) {
    a.classList.add("active");
  }
});
