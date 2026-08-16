import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

console.log("admin-users.js ทำงานแล้ว");

// ตรวจสอบ Login

let currentUid = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "login.html";

    return;
  }

  console.log("Login :", user.email);

  currentUid = user.uid;

  loadUsers();
});

// ดึงข้อมูล User

function loadUsers() {
  const usersRef = collection(db, "users");

  onSnapshot(
    usersRef,
    (snapshot) => {
      console.log("จำนวน User :", snapshot.size);

      let admin = "";
      let tech = "";
      let customer = "";
      let pending = "";

      snapshot.forEach((docData) => {
        const user = docData.data();

        const id = docData.id;

        console.log("USER :", user);

        const isSelf = id === currentUid;

        // สมาชิกที่รออนุมัติ → แสดงในตารางรออนุมัติเท่านั้น
        if (user.status === "pending") {
          pending += `

<tr>

<td>
${user.fullname || "-"}
${isSelf ? '<span class="badge bg-secondary ms-1">คุณ</span>' : ""}
</td>


<td>
${user.email || "-"}
</td>


<td>
${user.phone || "-"}
</td>


<td>


<button 
class="btn btn-success btn-sm"
onclick="approveAccount('${id}')">


<i class="fa-solid fa-check"></i>

อนุมัติ


</button>


<button 
class="btn btn-danger btn-sm ms-1"
onclick="rejectAccount('${id}')">


<i class="fa-solid fa-xmark"></i>

ปฏิเสธ


</button>


</td>


</tr>


`;

          return;
        }

        let row = `

<tr>

<td>
${user.fullname || "-"}
${isSelf ? '<span class="badge bg-secondary ms-1">คุณ</span>' : ""}
</td>


<td>
${user.email || "-"}
</td>


<td>


<select 
class="form-select"
onchange="changeRole('${id}',this.value)"
${isSelf ? "disabled title=\"ไม่สามารถเปลี่ยนตำแหน่งของตัวเองได้\"" : ""}
>


<option value="admin"
${user.role === "admin" ? "selected" : ""}>
Admin
</option>


<option value="technician"
${user.role === "technician" ? "selected" : ""}>
Technician
</option>


<option value="customer"
${user.role === "customer" ? "selected" : ""}>
Customer
</option>


</select>


</td>



<td>


<button 
class="btn btn-danger btn-sm"
onclick="deleteAccount('${id}')"
${isSelf ? "disabled title=\"ไม่สามารถลบบัญชีของตัวเองได้\"" : ""}>


<i class="fa-solid fa-trash"></i>

ลบ


</button>


</td>


</tr>


`;

        if (user.role === "admin") {
          admin += row;
        } else if (user.role === "technician") {
          tech += row;
        } else {
          customer += row;
        }
      });

      document.getElementById("adminTable").innerHTML = admin;

      document.getElementById("techTable").innerHTML = tech;

      document.getElementById("customerTable").innerHTML = customer;

      document.getElementById("pendingTable").innerHTML =
        pending ||
        `<tr><td colspan="4" class="text-center text-muted">ไม่มีคำขอรออนุมัติ</td></tr>`;
    },

    (error) => {
      console.error("Firebase Error :", error);
    },
  );
}

// เปลี่ยน Role

window.changeRole = async (id, role) => {
  if (id === currentUid) {
    Swal.fire({
      icon: "warning",
      title: "ทำรายการไม่ได้",
      text: "ไม่สามารถเปลี่ยนตำแหน่งของตัวเองได้",
    });

    return;
  }

  try {
    await updateDoc(
      doc(db, "users", id),

      {
        role: role,
      },
    );

    Swal.fire({
      icon: "success",

      title: "เปลี่ยนตำแหน่งแล้ว",

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

window.deleteAccount = async (id) => {
  const result = await Swal.fire({
    title: "ลบสมาชิก?",

    text: "ข้อมูลของสมาชิกรายนี้จะถูกลบออกจากระบบ",

    icon: "warning",

    showCancelButton: true,

    confirmButtonText: "ลบ",

    cancelButtonText: "ยกเลิก",
  });

  if (result.isConfirmed) {
    await deleteDoc(doc(db, "users", id));

    Swal.fire({
      icon: "success",

      title: "ลบแล้ว",

      timer: 1000,

      showConfirmButton: false,
    });
  }
};

// อนุมัติสมาชิก (รออนุมัติ → ใช้งานได้)

window.approveAccount = async (id) => {
  const result = await Swal.fire({
    title: "อนุมัติสมาชิก?",
    text: "ยืนยันการอนุมัติ สมาชิกจะสามารถเข้าสู่ระบบได้ทันที",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "อนุมัติ",
    cancelButtonText: "ยกเลิก",
  });

  if (!result.isConfirmed) return;

  try {
    await updateDoc(doc(db, "users", id), {
      status: "active",
    });

    Swal.fire({
      icon: "success",
      title: "อนุมัติแล้ว",
      text: "สมาชิกสามารถเข้าสู่ระบบได้แล้ว",
      timer: 1200,
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

// ปฏิเสธคำขอสมัคร (ลบบัญชี)

window.rejectAccount = async (id) => {
  const result = await Swal.fire({
    title: "ปฏิเสธคำขอ?",
    text: "บัญชีนี้จะถูกลบ และไม่สามารถเข้าสู่ระบบได้",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ปฏิเสธ",
    cancelButtonText: "ยกเลิก",
  });

  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "users", id));

    Swal.fire({
      icon: "success",
      title: "ปฏิเสธแล้ว",
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
