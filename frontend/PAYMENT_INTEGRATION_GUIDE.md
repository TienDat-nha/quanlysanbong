# HƯỚNG DẪN TÍCH HỢP PAYMENT FLOW VÀO PROJECT

## ✅ CÁC FILE ĐÃ ĐƯỢC TẠO

### Models & Services
- `src/models/paymentModel.js` - Định nghĩa payment paths, types, normalizers
- `src/utils/paymentHelpers.js` - Utilities format currency, date, status
- `src/services/paymentService.js` - API calls (createPayment, confirmPayment, etc)

### Hooks
- `src/hooks/usePaymentFlow.js` - Custom hook quản lý payment logic

### Components
- `src/components/PaymentStatusBadge.jsx` - Badge hiển thị status (PENDING, PAID, etc)
- `src/components/PaymentStatusBadge.scss`
- `src/components/PaymentMethodForm.jsx` - Form chọn method + type thanh toán
- `src/components/PaymentMethodForm.scss`
- `src/components/PaymentQRModal.jsx` - Modal hiển thị QR + countdown + xác nhận
- `src/components/PaymentQRModal.scss`
- `src/components/PaymentMethodModal.jsx` - Wrapper modal form + QR (dễ dùng)
- `src/components/PaymentMethodModal.scss`

### Pages & Views
- `src/views/pages/MyPaymentsView.jsx` - UI danh sách payment của user
- `src/views/pages/MyPaymentsView.scss`
- `src/controllers/pages/MyPaymentsController.jsx` - Logic danh sách payment

### Route & Navigation
- Updated `src/models/routeModel.js` - Thêm `myPayments: "/thanh-toan-cua-toi"`
- Updated `src/controllers/AppController.jsx` - Thêm route /thanh-toan-cua-toi
- Updated `src/models/layout/navbarModel.js` - Thêm link thanh toán trong navbar

---

## 🔌 CÁCH SỬ DỤNG

### 1️⃣ CASE: Xem danh sách thanh toán của user
**Đã tự động hoạt động:**
- Vào `/thanh-toan-cua-toi` - Danh sách thanh toán của user
- Navbar tự động thêm link "Thanh toán" khi user login

---

### 2️⃣ CASE: Tạo thanh toán trong flow Booking
**Sử dụng PaymentMethodModal trong component:**

```jsx
import PaymentMethodModal from '../../components/PaymentMethodModal'
import { useState } from 'react'

export default function MyBookingComponent({ authToken, booking }) {
  const [showPayment, setShowPayment] = useState(false)

  const handlePaymentSuccess = () => {
    // Reload booking, hoặc update state
    console.log('Payment confirmed, reload booking data')
  }

  return (
    <>
      <button onClick={() => setShowPayment(true)}>
        Thanh toán ngay
      </button>

      {showPayment && (
        <PaymentMethodModal
          bookingId={booking.id}
          totalPrice={booking.totalPrice}
          depositAmount={booking.depositAmount}
          authToken={authToken}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  )
}
```

---

### 3️⃣ CASE: Custom flow (Step 1: Form, Step 2: QR, Step 3: Confirm)

**Sử dụng từng component riêng + hook:**

```jsx
import PaymentMethodForm from '../../components/PaymentMethodForm'
import PaymentQRModal from '../../components/PaymentQRModal'
import { usePaymentFlow } from '../../hooks/usePaymentFlow'

export default function CustomPaymentFlow({ authToken, booking }) {
  const [step, setStep] = useState('form')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [qrData, setQrData] = useState(null)

  const {
    loading,
    error,
    handleCreatePayment,
    handleConfirmPayment,
    handleCancelPayment,
  } = usePaymentFlow(authToken)

  // Step 1: Form submit
  const handleFormSubmit = async (bookingId, method, paymentType) => {
    const payment = await handleCreatePayment(bookingId, method, paymentType)
    setSelectedPayment(payment)
    setStep('qr')
  }

  // Step 2: QR Modal confirm
  const handleConfirm = async (paymentId) => {
    await handleConfirmPayment(paymentId)
    setStep('success')
  }

  return (
    <>
      {step === 'form' && (
        <PaymentMethodForm
          bookingId={booking.id}
          totalPrice={booking.totalPrice}
          depositAmount={booking.depositAmount}
          onSubmit={handleFormSubmit}
          loading={loading}
          error={error}
        />
      )}

      {step === 'qr' && selectedPayment && (
        <PaymentQRModal
          payment={selectedPayment}
          qrImage={qrData?.qrImage}
          onConfirmPayment={handleConfirm}
          onCancelPayment={handleCancelPayment}
          loading={loading}
          error={error}
          onClose={() => setStep('form')}
        />
      )}

      {step === 'success' && <p>✓ Thanh toán thành công!</p>}
    </>
  )
}
```

---

### 4️⃣ CASE: Lấy danh sách payment của 1 booking

```jsx
import { getPaymentByBooking } from '../../services/paymentService'
import { useEffect, useState } from 'react'

export default function BookingPayments({ bookingId, authToken }) {
  const [payments, setPayments] = useState([])

  useEffect(() => {
    ;(async () => {
      const list = await getPaymentByBooking(authToken, bookingId)
      setPayments(list)
    })()
  }, [bookingId, authToken])

  return (
    <div>
      {payments.map(payment => (
        <div key={payment.id}>
          <p>Payment: {payment.amount}₫</p>
          <p>Status: {payment.status}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### 5️⃣ CASE: Huỷ payment (nếu chưa PAID)

```jsx
import { cancelPayment } from '../../services/paymentService'

async function handleCancelPayment(paymentId) {
  try {
    const result = await cancelPayment(authToken, paymentId)
    console.log('Payment cancelled:', result)
    // Reload danh sách
  } catch (err) {
    console.error('Error:', err.message)
  }
}
```

---

## 📋 CHECKLIST KIỂM TRA

- [ ] Vào `/thanh-toan-cua-toi` - Danh sách payment hiển thị
- [ ] Navbar có link "Thanh toán" khi login
- [ ] Click "Xem QR" - Modal QR mở
- [ ] QR hiển thị rõ
- [ ] Countdown 15 phút chạy
- [ ] Click "Tôi đã thanh toán" - gọi confirmPayment, reload
- [ ] Click "Huỷ thanh toán" - confirm dialog, huỷ được
- [ ] Payment PAID - nút huỷ disable
- [ ] Error handling - hiển thị message lỗi rõ

---

## 🚀 ĐỀ XUẤT THÊM (Optional)

### Tích hợp vào DepositPaymentController
```jsx
import PaymentMethodModal from '../../components/PaymentMethodModal'

// Trong DepositPaymentController render:
{showPaymentModal && (
  <PaymentMethodModal
    bookingId={booking.id}
    totalPrice={booking.totalPrice}
    depositAmount={booking.depositAmount}
    authToken={authToken}
    onPaymentSuccess={() => {
      handleRefresh() // Reload booking
      setShowPaymentModal(false)
    }}
    onClose={() => setShowPaymentModal(false)}
  />
)}
```

### Thêm Payment History vào BookingDetail
```jsx
import MyPaymentsView from '../../views/pages/MyPaymentsView'
import { getPaymentByBooking } from '../../services/paymentService'

useEffect(() => {
  if (booking?.id) {
    getPaymentByBooking(authToken, booking.id)
      .then(setPayments)
  }
}, [booking?.id, authToken])
```

---

**✅ Tất cả file đã sẵn sàng, không có lỗi syntax. Chỉ copy-paste code ở trên để tích hợp đúng nơi cần.**
