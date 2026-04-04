/**
 * DEBUG SCRIPT - Kiểm tra hệ thống màu sắc booking
 * Copy content vào browser console để debug
 */

// 1. Kiểm tra xem CSS class có được apply không
function checkCSSClasses() {
  console.log("=== Kiểm tra CSS Classes ===");
  
  const slots = document.querySelectorAll(".bookingSlot");
  console.log(`Tổng số slot: ${slots.length}`);
  
  if (slots.length === 0) {
    console.warn("⚠️ Không tìm thấy slot nào! Có thể trang chưa load xử lý hoàn chỉnh.");
    return;
  }
  
  const slotStates = {};
  slots.forEach((slot, index) => {
    const classNames = slot.className;
    // Extract state từ className: bookingSlot--available, bookingSlot--booked, etc.
    const stateMatch = classNames.match(/bookingSlot--(\w+)/);
    const state = stateMatch ? stateMatch[1] : "unknown";
    
    slotStates[state] = (slotStates[state] || 0) + 1;
    
    if (index < 5) {
      const bgColor = window.getComputedStyle(slot).backgroundColor;
      console.log(`Slot ${index}: state=${state}, bgColor=${bgColor}, classes=${classNames}`);
    }
  });
  
  console.log("\n📊 Thống kê trạng thái slot:");
  Object.entries(slotStates).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });
}

// 2. Kiểm tra xem CSS colors có đúng không
function checkCSSColors() {
  console.log("\n=== Kiểm tra CSS Colors ===");
  
  const colors = {
    "available (trắng)": { selector: ".bookingSlot--available", expectedColor: "rgb(255, 255, 255)" },
    "booked (đỏ)": { selector: ".bookingSlot--booked", expectedColor: "rgb(193, 76, 76)" },
    "closed (xám)": { selector: ".bookingSlot--closed", expectedColor: "rgb(154, 154, 154)" },
    "past (xám)": { selector: ".bookingSlot--past", expectedColor: "rgb(154, 154, 154)" },
    "selected (xanh)": { selector: ".bookingSlot--selected", expectedColor: "rgba(46, 166, 91, 0.22)" },
  };
  
  Object.entries(colors).forEach(([label, { selector, expectedColor }]) => {
    const element = document.querySelector(selector);
    if (element) {
      const actualColor = window.getComputedStyle(element).backgroundColor;
      console.log(`${label}: ${actualColor}`);
    } else {
      console.warn(`⚠️ ${label}: Không tìm thấy element với selector "${selector}"`);
    }
  });
}

// 3. Kiểm tra legend
function checkLegend() {
  console.log("\n=== Kiểm tra Legend ===");
  const legend = document.querySelector(".bookingLegend");
  if (legend) {
    console.log("✓ Legend tồn tại");
    console.log(legend.innerHTML);
  } else {
    console.warn("⚠️ Legend không tồn tại");
  }
}

// 4. Kiểm tra số lượng booked vs available
function checkBookingRatio() {
  console.log("\n=== Kiểm tra Tỷ lệ Booked/Available ===");
  
  const slots = document.querySelectorAll(".bookingSlot");
  const bookedSlots = document.querySelectorAll(".bookingSlot--booked");
  const availableSlots = document.querySelectorAll(".bookingSlot--available");
  const closedSlots = document.querySelectorAll(".bookingSlot--closed");
  const selectedSlots = document.querySelectorAll(".bookingSlot--selected");
  
  console.log(`Total slots: ${slots.length}`);
  console.log(`  🔴 Booked (đã đặt): ${bookedSlots.length}`);
  console.log(`  ⚪ Available (trống): ${availableSlots.length}`);
  console.log(`  ⚫ Closed (không chọn): ${closedSlots.length}`);
  console.log(`  🟢 Selected (chọn): ${selectedSlots.length}`);
  
  if (bookedSlots.length === 0) {
    console.warn("⚠️ Không có slot nào được đánh dấu là 'booked'! Có thể dữ liệu không load.");
  }
}

// 5. Kiểm tra React props
function checkReactProps() {
  console.log("\n=== Kiểm tra React Props ===");
  
  const slot = document.querySelector(".bookingSlot");
  if (!slot) {
    console.warn("⚠️ Không tìm thấy slot để inspect");
    return;
  }
  
  // Try to get React fiber
  const fiberKey = Object.keys(slot).find(key => key.startsWith("__react"));
  if (fiberKey) {
    const fiber = slot[fiberKey];
    console.log("React Fiber tìm thấy:", fiber);
    console.log("Props:", fiber?.memoizedProps);
  } else {
    console.warn("⚠️ Không tìm thấy React info (có thể React DevTools khác cách lưu)");
  }
}

// 6. Console output format
function printSummary() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  BOOKING COLOR DEBUG - Summary        ║");
  console.log("╚════════════════════════════════════════╝\n");
  
  checkCSSClasses();
  checkCSSColors();
  checkLegend();
  checkBookingRatio();
}

// Run when ready
console.log("🚀 Khởi tạo Booking Color Debugger...");
printSummary();
checkReactProps();

console.log("\n💡 Gợi ý:");
console.log("- Nếu không có slot nào, trang có thể chưa load dữ liệu");
console.log("- Nếu tất cả slot trắng, có thể API getBookedSlots không work");
console.log("- Nếu CSS color không đúng, kiểm tra App.css");
console.log("- Mở Network tab để kiểm tra API calls");
