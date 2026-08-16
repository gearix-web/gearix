// ครม.เดียวสำหรับสถานะเคสซ่อม ใช้ร่วมกันทั้ง customer.html และ technician.html
// เดิม technician.html เขียนสถานะลง Firestore เป็น pending/assigned/repairing/completed
// แต่ customer.html เช็คคำว่า "Open"/"Under Repair"/"Ready To Ship" ซึ่งไม่ตรงกัน
// เลยทำให้สีป้ายสถานะฝั่งลูกค้าไม่เคยขึ้นถูกต้อง -> รวมไว้ที่นี่ที่เดียวกันบั๊กซ้ำในอนาคต

export const STATUS_META = {
  pending:   { label: "รอช่างรับงาน",     css: "status-pending",   step: 0 },
  assigned:  { label: "ช่างรับงานแล้ว",    css: "status-assigned",  step: 1 },
  repairing: { label: "กำลังซ่อม",         css: "status-repairing", step: 2 },
  completed: { label: "พร้อมส่งมอบ",       css: "status-completed", step: 3 },
};

export function statusMeta(status){
  return STATUS_META[status] || { label: status || "ไม่ทราบสถานะ", css: "status-pending", step: 0 };
}

export const STATUS_STEPS = [
  { key: "pending",   label: "รับเรื่อง" },
  { key: "assigned",  label: "ช่างรับงาน" },
  { key: "repairing", label: "กำลังซ่อม" },
  { key: "completed", label: "พร้อมส่งมอบ" },
];
