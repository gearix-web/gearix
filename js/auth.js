import { auth, db } from "./firebase-config.js";


import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
}
from 
"https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";


import {
doc,
setDoc,
getDoc,
serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";



// ======================
// แยกหน้าเข้าสู่ระบบตามสิทธิ์
// customer/ = ลูกค้า เท่านั้น / staff/ = ช่าง+แอดมิน เท่านั้น
// ======================

// URL ข้าม portal — เมื่อแยก deploy บน Vercel เป็นคนละ domain
// ให้เปลี่ยนสองค่าด้านล่างเป็น URL จริง เช่น:
//   customer: "https://customer.example.com/login.html"
//   staff:    "https://staff.example.com/login.html"
const PORTAL_URLS = {
  customer: "../customer/login.html",
  staff: "../staff/login.html",
};

// portal ที่เปิดอยู่ (ดูจากโฟลเดอร์ใน path)
const PORTAL = location.pathname.includes("/customer/") ? "customer" : "staff";

// แท็ก <a data-portal="customer|staff"> ให้ชี้ไป URL ของ portal นั้นโดยอัตโนมัติ
// (ช่วยให้ลิงก์ข้าม portal ใช้ได้ทั้งตอนรันในเครื่องและตอนแยก domain)
document.querySelectorAll("[data-portal]").forEach((a) => {
  a.href = PORTAL_URLS[a.dataset.portal] || a.href;
});

function isLoginPage(){ return location.pathname.split("/").pop() === "login.html"; }
function isStaffPage(){ return PORTAL === "staff" && isLoginPage(); }
function isCustomerPage(){ return PORTAL === "customer" && isLoginPage(); }

// ถ้าล็อกอินอยู่แล้วแต่เปิดผิดฝั่ง ให้เด้งกลับไปหน้าของตัวเองทันที
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  getDoc(doc(db, "users", user.uid))
    .then((snap) => {
      if (!snap.exists()) return;
      const role = snap.data().role;
      if (isStaffPage() && role === "customer") location.href = PORTAL_URLS.customer;
      if (isCustomerPage() && (role === "admin" || role === "technician")) location.href = PORTAL_URLS.staff;
    })
    .catch(() => {});
});


// ======================
// REGISTER
// ======================


const registerForm =
document.getElementById("registerForm");


if(registerForm){


registerForm.addEventListener(
"submit",
async(e)=>{


e.preventDefault();



const fullname =
document.getElementById("fullname").value.trim();


const phone =
document.getElementById("phone").value.trim();


const address =
document.getElementById("address")
? document.getElementById("address").value.trim()
: "";


const email =
document.getElementById("email").value.trim();


const password =
document.getElementById("password").value;



if(!fullname || !phone || !email || !password){


Swal.fire({

icon:"warning",

title:"ข้อมูลไม่ครบ",

text:"กรุณากรอกข้อมูลให้ครบทุกช่อง"

});


return;

}



try{


Swal.fire({

title:"กำลังสมัครสมาชิก",

text:"กรุณารอสักครู่",

allowOutsideClick:false,

didOpen:()=>{

Swal.showLoading();

}

});



const userCredential =
await createUserWithEmailAndPassword(
auth,
email,
password
);



await setDoc(

doc(
db,
"users",
userCredential.user.uid
),

{


uid:
userCredential.user.uid,


fullname,


phone,


address,


email,


role:
(PORTAL === "staff" ? "technician" : "customer"),


status:
(PORTAL === "staff" ? "pending" : "active"),


createdAt:
serverTimestamp()


}

);



// หน้า staff/login.html = สมัครเป็นช่างเทคนิค ต้องรอแอดมินอนุมัติก่อนใช้งาน
if(PORTAL === "staff"){

await signOut(auth);

await Swal.fire({

icon:"success",

title:"ส่งคำขอสมัครสมาชิกแล้ว",

text:"กรุณารอผู้ดูแลระบบอนุมัติก่อนเข้าสู่ระบบ",

confirmButtonText:"ตกลง"

});

window.location.href="login.html";

return;

}



await Swal.fire({

icon:"success",

title:"สมัครสมาชิกสำเร็จ",

text:"สามารถเข้าสู่ระบบได้แล้ว",

confirmButtonText:"เข้าสู่ระบบ"

});



window.location.href="index.html";



}

catch(error){


console.error(error);



Swal.fire({

icon:"error",

title:"สมัครสมาชิกไม่สำเร็จ",

text:getFirebaseError(error.code)

});


}


});


}





// ======================
// LOGIN
// ======================


const loginForm =
document.getElementById("loginForm");



if(loginForm){


loginForm.addEventListener(

"submit",

async(e)=>{


e.preventDefault();



const email =
document.getElementById("loginEmail").value.trim();



const password =
document.getElementById("loginPassword").value;



if(!email || !password){


Swal.fire({

icon:"warning",

title:"กรุณากรอกข้อมูล",

text:"Email และ Password ต้องไม่ว่าง"

});


return;

}



try{


Swal.fire({

title:"กำลังเข้าสู่ระบบ",

text:"กำลังตรวจสอบข้อมูล",

allowOutsideClick:false,

didOpen:()=>{

Swal.showLoading();

}

});




const userCredential =

await signInWithEmailAndPassword(

auth,

email,

password

);



const uid =
userCredential.user.uid;



const userDoc =

await getDoc(

doc(
db,
"users",
uid
)

);




if(!userDoc.exists()){


Swal.fire({

icon:"error",

title:"ไม่พบข้อมูลผู้ใช้",

text:"กรุณาติดต่อผู้ดูแลระบบ"

});


return;

}




const userData =
userDoc.data();



// ยังไม่ได้รับการอนุมัติจากแอดมิน → ห้ามเข้าสู่ระบบ
if (userData.status === "pending") {

await signOut(auth);

await Swal.fire({

icon:"info",

title:"บัญชียังไม่ได้รับการอนุมัติ",

text:"กรุณารอผู้ดูแลระบบอนุมัติบัญชีก่อนเข้าสู่ระบบ",

confirmButtonText:"ตกลง"

});

return;

}



// เช็คสิทธิ์: หน้าช่าง/แอดมิน รับแค่ช่างกับแอดมิน, หน้าลูกค้า รับแค่ลูกค้า

if (isStaffPage() && userData.role === "customer") {

Swal.fire({

icon:"info",

title:"บัญชีลูกค้า",

text:"บัญชีนี้เป็นลูกค้า กรุณาเข้าสู่ระบบที่หน้าลูกค้า",

confirmButtonText:"ไปหน้าลูกค้า"

}).then(() => {

window.location.href = PORTAL_URLS.customer;

});

return;

}



if (isCustomerPage() && (userData.role === "admin" || userData.role === "technician")) {

Swal.fire({

icon:"info",

title:"บัญชีช่าง/แอดมิน",

text:"กรุณาเข้าสู่ระบบที่หน้าช่าง/แอดมิน",

confirmButtonText:"ไปหน้าล็อกอินช่าง/แอดมิน"

}).then(() => {

window.location.href = PORTAL_URLS.staff;

});

return;

}



await Swal.fire({

icon:"success",

title:"เข้าสู่ระบบสำเร็จ",

text:
`ยินดีต้อนรับ ${userData.fullname}`,

timer:1500,

showConfirmButton:false

});





// แยกสิทธิ์


switch(userData.role){



case "admin":

window.location.href =
(PORTAL === "staff" ? "index.html" : PORTAL_URLS.staff);

break;



case "technician":

window.location.href =
(PORTAL === "staff" ? "technician.html" : PORTAL_URLS.staff);

break;



case "customer":

window.location.href =
(PORTAL === "customer" ? "index.html" : PORTAL_URLS.customer);

break;



default:


Swal.fire({

icon:"error",

title:"สิทธิ์การใช้งานไม่ถูกต้อง",

text:"ไม่พบสิทธิ์การใช้งานสำหรับบัญชีนี้"

});


}



}



catch(error){


console.error(error);



Swal.fire({

icon:"error",

title:"เข้าสู่ระบบไม่สำเร็จ",

text:getFirebaseError(error.code)

});


}


});


}





// ======================
// Firebase Error
// ======================


function getFirebaseError(code){


switch(code){


case "auth/email-already-in-use":

return "Email นี้ถูกใช้งานแล้ว";


case "auth/invalid-email":

return "รูปแบบ Email ไม่ถูกต้อง";


case "auth/weak-password":

return "Password ต้องมีอย่างน้อย 6 ตัว";


case "auth/invalid-credential":

return "Email หรือ Password ไม่ถูกต้อง";


case "auth/user-not-found":

return "ไม่พบผู้ใช้นี้";


default:

return "เกิดข้อผิดพลาด กรุณาลองใหม่";


}


}