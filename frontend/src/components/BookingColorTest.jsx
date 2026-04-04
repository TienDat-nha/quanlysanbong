import React from 'react'
import '../App.css'

/**
 * TEST COMPONENT: Kiểm tra Hệ Thống Màu Sắc Booking
 * 
 * Để sử dụng:
 * 1. Import component này vào App.js
 * 2. Nhúng <BookingColorTest /> vào JSX
 * 3. Xem các slot hiển thị với 5 trạng thái khác nhau
 * 
 * Nếu bạn thấy:
 * - Ô trắng → Available (chưa đặt) ✓
 * - Ô đỏ → Booked (đã đặt) ✓
 * - Ô xám → Closed/Past (không thể đặt) ✓
 * - Ô xanh nhạt → Selected (đang chọn) ✓
 * 
 * Thì hệ thống màu sắc HOẠT ĐỘNG ĐÚNG!
 */

const BookingColorTest = () => {
  const testSlots = [
    { id: '1', state: 'available', label: 'Available\n(Trống)', timeSlot: '08:00 - 09:00' },
    { id: '2', state: 'booked', label: 'Booked\n(Đã đặt)', timeSlot: '09:00 - 10:00' },
    { id: '3', state: 'closed', label: 'Closed\n(Ngoài giờ)', timeSlot: '11:00 - 12:00' },
    { id: '4', state: 'past', label: 'Past\n(Quá khứ)', timeSlot: '06:00 - 07:00' },
    { id: '5', state: 'selected', label: 'Selected\n(Chọn)', timeSlot: '14:00 - 15:00' },
  ]

  return (
    <div style={{ padding: '40px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>
          🎨 Kiểm Tra Hệ Thống Màu Sắc Booking
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '40px', color: '#666' }}>
          Test Color System - Nếu bạn thấy 5 ô với màu khác nhau, hệ thống đang hoạt động!
        </p>

        {/* Test 1: Basic Slots */}
        <section style={{ marginBottom: '50px', backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '20px' }}>Test 1: Các Trạng Thái Slot</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            {testSlots.map(slot => (
              <div key={slot.id} style={{ textAlign: 'center' }}>
                <button
                  className={`bookingSlot bookingSlot--${slot.state}`}
                  style={{ 
                    width: '100%', 
                    minHeight: '80px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: slot.state === 'closed' || slot.state === 'past' || slot.state === 'booked' ? 'not-allowed' : 'pointer',
                  }}
                  disabled={slot.state === 'closed' || slot.state === 'past' || slot.state === 'booked'}
                  title={slot.timeSlot}
                >
                  {slot.state === 'selected' ? '✓' : ''}
                </button>
                <p style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                  {slot.state.toUpperCase()}
                </p>
                <p style={{ margin: '4px 0', fontSize: '11px', color: '#666', whiteSpace: 'pre-wrap' }}>
                  {slot.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Test 2: Legend */}
        <section style={{ marginBottom: '50px', backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '20px' }}>Test 2: Hàng Chú Giải (Legend)</h2>
          <div className="bookingLegend" style={{ gap: '20px', marginBottom: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--available" />
              ⚪ Trống (Available)
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--booked" />
              🔴 Đã đặt (Booked)
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--closed" />
              ⚫ Không chọn được (Closed)
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--selected" />
              🟢 Đang chọn (Selected)
            </span>
          </div>
        </section>

        {/* Test 3: Booking Grid Simulation */}
        <section style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '20px' }}>Test 3: Mô Phỏng Bảng Lịch Booking</h2>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(6, 70px)', gap: '0', minWidth: '500px', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ backgroundColor: '#d0eef0', padding: '10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #ccc' }}>
                Sân Con / Giờ
              </div>
              {['8:00', '9:00', '10:00', '11:00', '14:00', '15:00'].map((time, i) => (
                <div key={i} style={{ backgroundColor: '#d0eef0', padding: '10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #ccc', fontSize: '12px' }}>
                  {time}
                </div>
              ))}

              {/* Row 1 */}
              <div style={{ backgroundColor: '#dff1e5', padding: '10px', borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
                Sân 1
              </div>
              {['available', 'available', 'booked', 'closed', 'available', 'selected'].map((state, i) => (
                <button
                  key={i}
                  className={`bookingSlot bookingSlot--${state}`}
                  style={{ minHeight: '50px', borderRight: '1px solid #ccc', borderTop: 'none', borderLeft: 'none' }}
                  disabled={state === 'closed' || state === 'booked'}
                  title={`${state}`}
                >
                  {state === 'selected' ? '✓' : ''}
                </button>
              ))}

              {/* Row 2 */}
              <div style={{ backgroundColor: '#dff1e5', padding: '10px', borderRight: '1px solid #ccc', fontWeight: 'bold' }}>
                Sân 2
              </div>
              {['available', 'booked', 'booked', 'available', 'available', 'available'].map((state, i) => (
                <button
                  key={i}
                  className={`bookingSlot bookingSlot--${state}`}
                  style={{ minHeight: '50px', borderRight: '1px solid #ccc', borderTop: 'none', borderLeft: 'none' }}
                  disabled={state === 'closed' || state === 'booked'}
                  title={`${state}`}
                >
                  {state === 'selected' ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>
          <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            💡 Gợi ý: Mô phỏng này để kiểm tra xem các màu sắc có hiển thị đúng trong bảng lịch booking.
          </p>
        </section>

        {/* Test Results */}
        <section style={{ marginTop: '50px', backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px', border: '2px solid #4caf50' }}>
          <h3 style={{ color: '#2e7d32', marginTop: '0' }}>✅ Kiểm Tra Thành Công Nếu Bạn Thấy:</h3>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>✓ Ô trắng (Available) có thể click</li>
            <li>✓ Ô đỏ (Booked) không thể click và có tô màu đỏ</li>
            <li>✓ Ô xám (Closed) không thể click và có tô màu xám</li>
            <li>✓ Ô xanh (Selected) có hiển thị dấu check và tô màu xanh nhạt</li>
            <li>✓ Legend hiển thị chính xác với các màu tương ứng</li>
          </ul>
        </section>

        {/* Expected Color Values */}
        <section style={{ marginTop: '50px', backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '8px', border: '2px solid #9c27b0' }}>
          <h3 style={{ color: '#6a1b9a', marginTop: '0' }}>🎨 Các Giá Trị Màu CSS:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
              <strong>Available:</strong><br/>
              background: #fff<br/>
              <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#fff', border: '1px solid #999', marginTop: '4px' }}></span>
            </div>
            <div style={{ backgroundColor: '#f8f8f8', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
              <strong>Booked:</strong><br/>
              background: #c14c4c<br/>
              <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#c14c4c', borderRadius: '2px', marginTop: '4px' }}></span>
            </div>
            <div style={{ backgroundColor: '#f8f8f8', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
              <strong>Closed/Past:</strong><br/>
              background: #9a9a9a<br/>
              <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#9a9a9a', borderRadius: '2px', marginTop: '4px' }}></span>
            </div>
            <div style={{ backgroundColor: '#f8f8f8', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
              <strong>Selected:</strong><br/>
              background: rgba(46, 166, 91, 0.22)<br/>
              <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: 'rgba(46, 166, 91, 0.22)', borderRadius: '2px', border: '2px solid #0d672e', marginTop: '4px' }}></span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default BookingColorTest
