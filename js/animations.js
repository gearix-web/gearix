// animations.js
// อนิเมชั่นกลางของทั้งระบบ (ใช้ anime.js) โหลดคู่กับ anime.min.js ในทุกหน้า
// ออกแบบให้ "แปะแล้วใช้ได้เลย" — ไม่ต้องไปแก้โค้ด business logic เดิม (admin.js, admin-repair.js ฯลฯ)
// เพราะทำงานผ่าน MutationObserver คอยจับความเปลี่ยนแปลงของ DOM ที่มีอยู่แล้วแทน
//
// ครอบคลุม:
// 1) Entrance animation ตอนโหลดหน้า (topbar/sidebar, hero/dash-head, stat card, panel/content)
// 2) Stagger รายการในตาราง/รายการ ตอน "เติมข้อมูลครั้งแรก" เท่านั้น (ไม่เล่นซ้ำทุกครั้งที่ Firestore
//    ยิง onSnapshot เพราะจะรก/กระพริบระหว่างใช้งานจริง)
// 3) นับเลขสถิติวิ่ง (count-up) ทุกครั้งที่ค่าตัวเลขเปลี่ยน
// 4) Popup/modal (.chat-popup, .ind-modal-backdrop) เด้งเข้า-ออกแบบนุ่ม ๆ แทนการโชว์/ซ่อนทันที
// 5) Hover micro-interaction เบา ๆ ให้ปุ่ม/การ์ดหลัก ๆ

(function () {
  if (typeof anime === "undefined") {
    console.warn("[animations.js] ไม่พบ anime.js กรุณาโหลด anime.min.js ก่อนไฟล์นี้");
    return;
  }
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- entrance บนโหลดหน้า ---------------- */
  function revealEntrance() {
    if (reduceMotion) return;
    const tl = anime.timeline({ easing: "easeOutExpo" });

    const nav = document.querySelector(".topbar, .sidebar");
    if (nav) {
      const isSidebar = nav.classList.contains("sidebar");
      tl.add({
        targets: nav,
        opacity: [0, 1],
        translateX: isSidebar ? [-32, 0] : [0, 0],
        translateY: isSidebar ? [0, 0] : [-16, 0],
        duration: 550,
      }, 0);
    }

    const hero = document.querySelector(".hero-band, .dash-head");
    if (hero) {
      tl.add({
        targets: hero,
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 600,
      }, 120);
    }

    const stats = document.querySelectorAll(".stat-card, .card-box");
    if (stats.length) {
      tl.add({
        targets: stats,
        opacity: [0, 1],
        translateY: [22, 0],
        scale: [0.94, 1],
        delay: anime.stagger(70),
        duration: 550,
      }, 260);
    }

    const panels = document.querySelectorAll(".panel");
    if (panels.length) {
      tl.add({
        targets: panels,
        opacity: [0, 1],
        translateY: [24, 0],
        delay: anime.stagger(90),
        duration: 600,
      }, 380);
    }

    // หน้า admin-users / admin-repair ไม่มี .panel แต่มี .content ที่รวม heading/table ไว้ตรง ๆ
    if (!panels.length) {
      const contentKids = document.querySelectorAll(".content > *:not(.dash-head):not(.d-none)");
      if (contentKids.length) {
        tl.add({
          targets: contentKids,
          opacity: [0, 1],
          translateY: [16, 0],
          delay: anime.stagger(60),
          duration: 500,
        }, 380);
      }
    }

    // หน้า login: การ์ดหลัก + หมุดย้ำ (rivet) + เนื้อหาฝั่งซ้าย
    const loginCard = document.querySelector(".card-box.login, .card.card-box");
    if (loginCard) {
      tl.add({ targets: loginCard, opacity: [0, 1], scale: [0.96, 1], duration: 550 }, 0);
      const rivets = document.querySelectorAll(".rivet");
      if (rivets.length) {
        tl.add({
          targets: rivets,
          opacity: [0, 1],
          scale: [0, 1],
          delay: anime.stagger(80),
          duration: 500,
          easing: "easeOutElastic(1, .6)",
        }, 200);
      }
      const leftKids = document.querySelectorAll(".left-content > *");
      if (leftKids.length) {
        tl.add({
          targets: leftKids,
          opacity: [0, 1],
          translateX: [-24, 0],
          delay: anime.stagger(100),
          duration: 550,
        }, 250);
      }
      const formSide = document.querySelector(".col-md-7");
      if (formSide) {
        tl.add({ targets: formSide, opacity: [0, 1], translateY: [16, 0], duration: 550 }, 300);
      }
    }
  }

  /* ---------------- stagger ตอนตารางเติมข้อมูลครั้งแรก ---------------- */
  // เฝ้าดูเฉพาะ "ครั้งแรกที่มีแถวโผล่ขึ้นมา" แล้วเลิกเฝ้า กันไม่ให้เล่นซ้ำทุกครั้งที่ onSnapshot อัปเดต
  function watchFirstFill(selector, rowSelector) {
    const container = document.querySelector(selector);
    if (!container) return;

    const tryAnimate = () => {
      const rows = rowSelector ? container.querySelectorAll(rowSelector) : container.children;
      if (!rows.length) return false;
      if (!reduceMotion) {
        anime({
          targets: Array.from(rows),
          opacity: [0, 1],
          translateY: [10, 0],
          delay: anime.stagger(40),
          duration: 400,
          easing: "easeOutQuad",
        });
      }
      return true;
    };

    if (tryAnimate()) return;

    const observer = new MutationObserver(() => {
      if (tryAnimate()) observer.disconnect();
    });
    observer.observe(container, { childList: true });
  }

  /* ---------------- นับเลขวิ่งทุกครั้งที่ค่าตัวเลขเปลี่ยน ---------------- */
  function watchCounters(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      let current = parseInt(el.textContent, 10) || 0;

      const observer = new MutationObserver(() => {
        const next = parseInt(el.textContent, 10);
        if (Number.isNaN(next) || next === current) return;

        const from = current;
        current = next;
        observer.disconnect();

        if (reduceMotion) {
          el.textContent = next;
          observer.observe(el, { childList: true, characterData: true, subtree: true });
          return;
        }

        const obj = { val: from };
        el.textContent = from;
        anime({
          targets: obj,
          val: next,
          round: 1,
          duration: 600,
          easing: "easeOutExpo",
          update: () => { el.textContent = Math.round(obj.val); },
          complete: () => {
            el.textContent = next;
            observer.observe(el, { childList: true, characterData: true, subtree: true });
          },
        });
      });

      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---------------- popup / modal เด้งเข้า-ออก ---------------- */
  // เฝ้า class "show" ของ .chat-popup กับ .ind-modal-backdrop แล้วเสริม pop animation ทับ
  // ของเดิม (ไม่ได้ไปแตะ logic การเปิด/ปิดที่มีอยู่แล้วเลย)
  function watchPopups(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      let wasShown = el.classList.contains("show");

      const observer = new MutationObserver(() => {
        const isShown = el.classList.contains("show");
        if (isShown === wasShown) return;
        wasShown = isShown;
        if (reduceMotion) return;

        if (isShown) {
          anime({
            targets: el,
            opacity: [0, 1],
            scale: [0.92, 1],
            duration: 320,
            easing: "easeOutBack",
          });
        }
      });

      observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  /* ---------------- hover micro-interaction ---------------- */
  function attachHover(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      el.addEventListener("mouseenter", () => {
        if (reduceMotion) return;
        anime({ targets: el, scale: 1.03, translateY: -2, duration: 180, easing: "easeOutQuad" });
      });
      el.addEventListener("mouseleave", () => {
        if (reduceMotion) return;
        anime({ targets: el, scale: 1, translateY: 0, duration: 180, easing: "easeOutQuad" });
      });
    });
  }

  function init() {
    revealEntrance();
    watchCounters('h2[id$="Count"], .stat-num');
    [
      "#userTable", "#adminTable", "#techTable", "#customerTable",
      "#repairTable", "#caseTable",
    ].forEach((sel) => watchFirstFill(sel, "tr"));
    watchPopups(".chat-popup, .ind-modal-backdrop");
    attachHover(".btn-industrial, .chip, .card-box, .stat-card, .sidebar a, .chat-float");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AnimFX = { revealEntrance, watchFirstFill, watchCounters, watchPopups, attachHover };
})();
