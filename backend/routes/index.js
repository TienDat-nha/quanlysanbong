const fs = require("fs")
const fsPromises = require("fs/promises")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })

const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const {
  getBookingsCollection,
  getContactsCollection,
  getDirectorySeedUsers,
  getEmailOtpsCollection,
  getFieldsCollection,
  getMongoDb,
  getNextSequenceValue,
  getUsersCollection,
  normalizeFieldSlug,
  toObjectId,
} = require("../models/mongo")
const { isEmailConfigured, sendRegisterOtpEmail } = require("../models/mailer")

const app = express()
const PORT = Number(process.env.PORT || 5000)
const JWT_SECRET = process.env.JWT_SECRET || "sanbong-dev-secret-change-this"
const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES || 10)
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 60)
const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/g, "")
const CLIENT_ORIGINS = String(process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean)
const PRIMARY_CLIENT_ORIGIN = CLIENT_ORIGINS[0] || "http://localhost:3000"
const SERVER_PUBLIC_URL = normalizeOrigin(process.env.SERVER_PUBLIC_URL || `http://localhost:${PORT}`)
const DEPOSIT_MIN_AMOUNT = Number(process.env.DEPOSIT_MIN_AMOUNT || 100000)
const STATIC_TRANSFER_BANK_NAME = String(process.env.STATIC_TRANSFER_BANK_NAME || "").trim()
const STATIC_TRANSFER_BANK_CODE = String(process.env.STATIC_TRANSFER_BANK_CODE || "").trim()
const STATIC_TRANSFER_ACCOUNT_NUMBER = String(process.env.STATIC_TRANSFER_ACCOUNT_NUMBER || "").trim()
const STATIC_TRANSFER_ACCOUNT_NAME = String(process.env.STATIC_TRANSFER_ACCOUNT_NAME || "").trim()
const STATIC_TRANSFER_QR_IMAGE_URL = String(process.env.STATIC_TRANSFER_QR_IMAGE_URL || "").trim()
const STATIC_TRANSFER_NOTE_PREFIX = String(process.env.STATIC_TRANSFER_NOTE_PREFIX || "DATCOC")
  .trim()
const VNPAY_TMN_CODE = String(process.env.VNPAY_TMN_CODE || "").trim()
const VNPAY_HASH_SECRET = String(process.env.VNPAY_HASH_SECRET || "").trim()
const VNPAY_PAYMENT_URL = String(
  process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
).trim()
const MOMO_PARTNER_CODE = String(process.env.MOMO_PARTNER_CODE || "").trim()
const MOMO_ACCESS_KEY = String(process.env.MOMO_ACCESS_KEY || "").trim()
const MOMO_SECRET_KEY = String(process.env.MOMO_SECRET_KEY || "").trim()
const MOMO_PARTNER_NAME = String(process.env.MOMO_PARTNER_NAME || "SanBong").trim()
const MOMO_STORE_ID = String(process.env.MOMO_STORE_ID || "SanBongStore").trim()
const MOMO_CREATE_URL = String(
  process.env.MOMO_CREATE_URL || "https://test-payment.momo.vn/v2/gateway/api/create"
).trim()
const DEFAULT_FIELD_COVER_IMAGE =
  "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80"
const DEFAULT_FIELD_ARTICLE =
  "Sân bóng được tạo bởi chủ sân trên hệ thống SanBong. Vui lòng liên hệ chủ sân để nhận thêm thông tin và lịch sân mới nhất."
const UPLOADS_DIR = path.join(__dirname, "..", "uploads")
const ADMIN_IMAGE_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024
const SUPPORTED_IMAGE_MIME_TYPES = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
})
const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const isAllowedDevOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) {
    return false
  }

  try {
    const parsedOrigin = new URL(normalizedOrigin)
    return parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:"
  } catch (_error) {
    return false
  }
}

const isAllowedClientOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin)
  return Boolean(normalizedOrigin) && CLIENT_ORIGINS.includes(normalizedOrigin)
}

const createHttpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const sanitizeUploadFileBaseName = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/\.[^.]+$/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "image"
}

const getUploadExtensionFromMimeType = (value) =>
  SUPPORTED_IMAGE_MIME_TYPES[String(value || "").trim().toLowerCase()] || ""

const decodeUploadFileNameHeader = (value) => {
  const rawValue = String(value || "").trim()

  if (!rawValue) {
    return "image"
  }

  try {
    return decodeURIComponent(rawValue)
  } catch (_error) {
    return rawValue
  }
}

const createUploadedImagePath = (fileName) => `/uploads/${fileName}`
const getRequestBaseUrl = (req) => {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim()
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()

  if (forwardedHost) {
    return `${forwardedProto || req.protocol || "http"}://${forwardedHost}`.replace(/\/+$/g, "")
  }

  return SERVER_PUBLIC_URL
}

const createUploadedImageUrl = (req, fileName) => `${getRequestBaseUrl(req)}${createUploadedImagePath(fileName)}`
const getManagedUploadFileName = (value) => {
  const rawValue = String(value || "").trim()

  if (!rawValue) {
    return ""
  }

  try {
    const parsedUrl = new URL(rawValue, SERVER_PUBLIC_URL)
    const pathname = String(parsedUrl.pathname || "").trim()
    return pathname.startsWith("/uploads/") ? path.basename(pathname) : ""
  } catch (_error) {
    return rawValue.startsWith("/uploads/") ? path.basename(rawValue) : ""
  }
}

const getManagedUploadFileNames = (field) => {
  const source = [
    String(field?.coverImage || "").trim(),
    ...normalizeStringArray(field?.images),
  ]

  return Array.from(new Set(source.map((item) => getManagedUploadFileName(item)).filter(Boolean)))
}

const deleteManagedUploadFiles = async (fileNames = []) => {
  for (const fileName of fileNames) {
    try {
      await fsPromises.unlink(path.join(UPLOADS_DIR, fileName))
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error
      }
    }
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedClientOrigin(origin)) {
        return callback(null, true)
      }

      if (process.env.NODE_ENV !== "production" && isAllowedDevOrigin(origin)) {
        return callback(null, true)
      }

      return callback(createHttpError(403, "Origin không được phép truy cập API."))
    },
  })
)
app.use(express.json())
app.use("/uploads", express.static(UPLOADS_DIR))

const createToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}

const getComparablePasswordHash = (user) => {
  const passwordHash = String(user?.passwordHash || "").trim()
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash) ? passwordHash : ""
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập." })
  }

  const token = authHeader.slice("Bearer ".length)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.auth = payload
    return next()
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn." })
  }
}

const normalizeUserRole = (value) => {
  return String(value || "").trim().toLowerCase() === USER_ROLES.admin
    ? USER_ROLES.admin
    : USER_ROLES.customer
}

const isAdminRole = (value) => normalizeUserRole(value) === USER_ROLES.admin

const loadCurrentUserByAuth = async (req, res, next) => {
  const userId = toObjectId(req.auth?.sub)
  if (!userId) {
    return res.status(401).json({ message: "Không tìm thấy tài khoản đăng nhập." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne({ _id: userId })

    if (!user) {
      return res.status(401).json({ message: "Không tìm thấy tài khoản đăng nhập." })
    }

    req.currentUser = user
    return next()
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể xác thực tài khoản hiện tại."),
    })
  }
}

const adminMiddleware = (req, res, next) => {
  if (!isAdminRole(req.currentUser?.role)) {
    return res.status(403).json({ message: "Chỉ tài khoản quản trị viên mới được quản lý sân." })
  }

  return next()
}

const sanitizeMongoUser = (user) => ({
  id: String(user._id),
  fullName: user.fullName,
  email: user.email,
  role: normalizeUserRole(user.role),
  createdAt: user.createdAt,
})

const sanitizeMongoBooking = (booking, field = null) => {
  const paymentState = getBookingPaymentState(booking, field)
  const matchedSubField = field ? findFieldSubField(field, booking?.subFieldKey) : null

  return {
    id: String(booking._id),
    userId: booking.userId,
    fieldId: booking.fieldId,
    fieldName: booking.fieldName,
    subFieldKey: booking.subFieldKey || null,
    subFieldName: booking.subFieldName || null,
    subFieldType: booking.subFieldType || matchedSubField?.type || null,
    date: booking.date,
    timeSlot: booking.timeSlot,
    phone: booking.phone || null,
    address: booking.address,
    note: booking.note,
    status: booking.status,
    totalPrice: paymentState.totalPrice,
    depositAmount: paymentState.depositAmount,
    remainingAmount: paymentState.remainingAmount,
    depositPaid: paymentState.depositPaid,
    depositStatus: paymentState.depositStatus,
    depositMethod: paymentState.depositMethod,
    depositReference: paymentState.depositReference,
    depositPaidAt: paymentState.depositPaidAt,
    createdAt: booking.createdAt,
  }
}

const sanitizeBookingAvailability = (booking) => ({
  id: String(booking._id),
  fieldId: booking.fieldId,
  subFieldKey: booking.subFieldKey || null,
  subFieldName: booking.subFieldName || null,
  date: booking.date,
  timeSlot: booking.timeSlot,
  status: booking.status,
})

const DEFAULT_FIELD_SUB_FIELD_MAP = new Map([
  [1, ["Sân 1", "Sân 2", "Sân 3"]],
  [2, ["Sân 1", "Sân 2"]],
  [3, ["Sân 1"]],
  [4, ["Sân 1", "Sân 2", "Sân 3", "Sân 4"]],
  [5, ["Sân 1", "Sân 2"]],
  [6, ["Sân 1", "Sân 2"]],
])

const FIELD_TYPE_OPTIONS = Object.freeze(["Sân 5", "Sân 7", "Sân 11", "Futsal"])
const DEFAULT_FIELD_TYPE = FIELD_TYPE_OPTIONS[1]

const normalizeAsciiToken = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

const normalizeFieldType = (value, fallback = "") => {
  const rawValue = String(value || "").trim()
  const normalizedToken = normalizeAsciiToken(rawValue)

  if (!normalizedToken) {
    return String(fallback || "").trim()
  }

  if (normalizedToken.includes("futsal")) {
    return "Futsal"
  }

  if (normalizedToken.includes("11")) {
    return "Sân 11"
  }

  if (normalizedToken.includes("7")) {
    return "Sân 7"
  }

  if (normalizedToken.includes("5")) {
    return "Sân 5"
  }

  return String(fallback || "").trim()
}

const isSupportedFieldType = (value) => FIELD_TYPE_OPTIONS.includes(String(value || "").trim())

const normalizeSubFieldKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const createSubField = (key, name, options = {}) => {
  const normalizedPricePerHour = Math.round(Number(options.pricePerHour || 0))

  return {
    key: normalizeSubFieldKey(key),
    name: String(name || "").trim(),
    type: normalizeFieldType(options.type, String(options.type || "").trim()),
    openHours: String(options.openHours || "").trim(),
    pricePerHour:
      Number.isFinite(normalizedPricePerHour) && normalizedPricePerHour > 0
        ? normalizedPricePerHour
        : 0,
  }
}

const getDefaultFieldSubFields = (field) => {
  const defaults = DEFAULT_FIELD_SUB_FIELD_MAP.get(Number(field?.id)) || ["Sân 1"]
  return defaults.map((name) =>
    createSubField(name, name, {
      type: field?.type,
      openHours: field?.openHours,
      pricePerHour: field?.pricePerHour,
    })
  )
}

const getNormalizedFieldSubFields = (field) => {
  const source = Array.isArray(field?.subFields) ? field.subFields : []
  const normalized = source
    .map((subField, index) => {
      if (typeof subField === "string") {
        return createSubField(subField, subField, {
          type: field?.type,
          openHours: field?.openHours,
          pricePerHour: field?.pricePerHour,
        })
      }

      if (subField && typeof subField === "object") {
        const fallbackName = `Sân ${index + 1}`
        return createSubField(
          subField.key || subField.name || fallbackName,
          subField.name || fallbackName,
          {
            type: subField.type || field?.type,
            openHours: subField.openHours || field?.openHours,
            pricePerHour: subField.pricePerHour || field?.pricePerHour,
          }
        )
      }

      return null
    })
    .filter((subField) => subField?.key && subField?.name)

  return normalized.length > 0 ? normalized : getDefaultFieldSubFields(field)
}

const getNormalizedFieldByDocument = (field) => {
  if (!field) {
    return null
  }

  return {
    ...field,
    type: normalizeFieldType(field.type, String(field.type || "").trim()),
    slug: normalizeFieldSlug(field.slug || field.name, `san-${field.id || "new"}`),
    subFields: getNormalizedFieldSubFields(field),
  }
}

const findFieldSubField = (field, subFieldKey) => {
  const normalizedKey = normalizeSubFieldKey(subFieldKey)
  if (!normalizedKey) {
    return null
  }

  return getNormalizedFieldSubFields(field).find((subField) => subField.key === normalizedKey) || null
}

const sanitizeMongoField = (field, includeDetails = false) => {
  if (!field) {
    return null
  }

  const normalizedField = getNormalizedFieldByDocument(field)

  const sanitizedField = {
    id: normalizedField.id,
    name: normalizedField.name,
    slug: normalizedField.slug,
    address: normalizedField.address,
    district: normalizedField.district,
    type: normalizedField.type,
    openHours: normalizedField.openHours,
    pricePerHour: normalizedField.pricePerHour,
    rating: normalizedField.rating,
    coverImage: normalizedField.coverImage,
    subFields: normalizedField.subFields,
    ownerUserId: normalizedField.ownerUserId || null,
    ownerFullName: normalizedField.ownerFullName || null,
    managedByAdmin: Boolean(normalizedField.ownerUserId),
  }

  if (includeDetails) {
    sanitizedField.article = normalizedField.article
    sanitizedField.images = Array.isArray(normalizedField.images) ? normalizedField.images : []
  }

  return sanitizedField
}

const sanitizeMongoContact = (contact) => ({
  id: contact.id,
  name: contact.name,
  email: contact.email,
  phone: contact.phone,
  message: contact.message,
  createdAt: contact.createdAt,
})

const sanitizeDirectoryUser = (user) => ({
  id: Number(user.id),
  name: String(user.name || user.fullName || "").trim(),
})

const parseDirectoryUserId = (value) => {
  const userId = Number(value)
  return Number.isInteger(userId) && userId > 0 ? userId : null
}

const parseContactId = (value) => {
  const contactId = Number(value)
  return Number.isInteger(contactId) && contactId > 0 ? contactId : null
}

const buildDirectoryUserEmail = (userId) => `directory-user-${userId}@sanbong.local`

const createDirectoryUserDocument = async (userId, name) => ({
  id: userId,
  name,
  fullName: name,
  email: buildDirectoryUserEmail(userId),
  passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
  directoryVisible: true,
  createdAt: new Date(),
})

const isValidEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

const normalizePhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "")

  if (digits.startsWith("84") && digits.length === 11) {
    return `0${digits.slice(2)}`
  }

  return digits
}

const isValidPhoneNumber = (value) => /^0\d{9}$/.test(normalizePhoneNumber(value))

const parseBookingDate = (value) => {
  const normalized = String(value || "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null
  }

  const [year, month, day] = normalized.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

const parseTimeSlot = (value) => {
  const match = String(value || "").trim().match(
    /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/
  )

  if (!match) {
    return null
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2])
  const endMinutes = Number(match[3]) * 60 + Number(match[4])

  if (endMinutes <= startMinutes) {
    return null
  }

  return { startMinutes, endMinutes }
}

const getBookingScheduleError = (date, timeSlot, now = new Date()) => {
  const bookingDate = parseBookingDate(date)
  if (!bookingDate) {
    return "Ngày đặt không hợp lệ."
  }

  const parsedTimeSlot = parseTimeSlot(timeSlot)
  if (!parsedTimeSlot) {
    return "Khung giờ phải theo định dạng HH:mm - HH:mm và giờ kết thúc lớn hơn giờ bắt đầu."
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  if (bookingDate.getTime() < today.getTime()) {
    return "Không thể đặt lịch trong ngày đã qua."
  }

  const isToday = bookingDate.getTime() === today.getTime()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (isToday && parsedTimeSlot.startMinutes <= currentMinutes) {
    return "Khung giờ đặt sân phải ở tương lai."
  }

  return ""
}

const getBookingDurationMinutes = (timeSlot) => {
  const parsedTimeSlot = parseTimeSlot(timeSlot)
  if (!parsedTimeSlot) {
    return 0
  }

  return parsedTimeSlot.endMinutes - parsedTimeSlot.startMinutes
}

const calculateBookingTotalPrice = (pricePerHour, timeSlot) => {
  const totalMinutes = getBookingDurationMinutes(timeSlot)
  return Math.round((Number(pricePerHour || 0) * totalMinutes) / 60)
}

const normalizeMoney = (value) => {
  const normalized = Number(value)
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0
  }

  return Math.round(normalized)
}

const calculateBookingDepositAmount = (totalPrice) => {
  const normalizedTotal = normalizeMoney(totalPrice)
  if (!normalizedTotal) {
    return 0
  }

  return Math.min(normalizedTotal, DEPOSIT_MIN_AMOUNT)
}

const calculateBookingRemainingAmount = (totalPrice, depositAmount) =>
  Math.max(normalizeMoney(totalPrice) - normalizeMoney(depositAmount), 0)

const getBookingPaymentState = (booking, field = null) => {
  const fallbackPricePerHour = normalizeMoney(booking?.pricePerHour || field?.pricePerHour)
  let totalPrice = normalizeMoney(booking?.totalPrice)

  if (!totalPrice && fallbackPricePerHour > 0) {
    totalPrice = calculateBookingTotalPrice(fallbackPricePerHour, booking?.timeSlot)
  }

  let depositAmount = normalizeMoney(booking?.depositAmount)
  if (!depositAmount && totalPrice > 0) {
    depositAmount = calculateBookingDepositAmount(totalPrice)
  }

  if (totalPrice > 0) {
    depositAmount = Math.min(depositAmount, totalPrice)
  }

  const depositPaid = Boolean(booking?.depositPaid)
  let depositStatus = String(booking?.depositStatus || "")
    .trim()
    .toLowerCase()

  if (!depositStatus) {
    depositStatus = depositPaid ? "paid" : "unpaid"
  }

  if (depositPaid) {
    depositStatus = "paid"
  }

  return {
    totalPrice,
    depositAmount,
    remainingAmount: calculateBookingRemainingAmount(totalPrice, depositAmount),
    depositPaid,
    depositStatus,
    depositMethod: booking?.depositMethod || null,
    depositReference: booking?.depositReference || null,
    depositPaidAt: booking?.depositPaidAt || null,
    pricePerHour: fallbackPricePerHour,
  }
}

const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"]

const doesTimeSlotOverlap = (leftTimeSlot, rightTimeSlot) => {
  const left = parseTimeSlot(leftTimeSlot)
  const right = parseTimeSlot(rightTimeSlot)

  if (!left || !right) {
    return false
  }

  return left.startMinutes < right.endMinutes && right.startMinutes < left.endMinutes
}

const doesBookingBlockSubField = (booking, targetSubFieldKey) => {
  const bookingSubFieldKey = normalizeSubFieldKey(booking?.subFieldKey)
  const normalizedTargetKey = normalizeSubFieldKey(targetSubFieldKey)

  if (!bookingSubFieldKey) {
    return true
  }

  return bookingSubFieldKey === normalizedTargetKey
}

const generateOtpCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const parseFieldId = (value) => {
  const fieldId = Number(value)
  return Number.isInteger(fieldId) ? fieldId : null
}

const parseFieldOpenHours = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/)

  if (!match) {
    return null
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2])
  let endMinutes = Number(match[3]) * 60 + Number(match[4])

  if (endMinutes === 0) {
    endMinutes = 24 * 60
  }

  if (endMinutes <= startMinutes) {
    return null
  }

  return {
    startMinutes,
    endMinutes,
  }
}

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean)
}

const normalizeAdminSubFieldsPayload = (value, defaults = {}) => {
  const source = Array.isArray(value) ? value : []

  return source
    .map((subField, index) => {
      if (typeof subField === "string") {
        return createSubField(subField, subField, defaults)
      }

      if (!subField || typeof subField !== "object") {
        return null
      }

      const fallbackName = `Sân ${index + 1}`
      return createSubField(
        subField.key || subField.name || fallbackName,
        subField.name || fallbackName,
        {
          type: subField.type || defaults.type,
          openHours: subField.openHours || defaults.openHours,
          pricePerHour: subField.pricePerHour || defaults.pricePerHour,
        }
      )
    })
    .filter((subField) => subField?.key && subField?.name)
}

const getDefaultAdminFieldImages = (coverImage) => {
  const normalizedCoverImage = String(coverImage || "").trim() || DEFAULT_FIELD_COVER_IMAGE
  return [normalizedCoverImage]
}

const createUniqueFieldSlug = async (fieldsCollection, name, excludeId = null) => {
  const baseSlug = normalizeFieldSlug(name, "san-moi")
  let nextSlug = baseSlug
  let suffix = 2

  while (true) {
    const existingField = await fieldsCollection.findOne(
      excludeId
        ? { slug: nextSlug, _id: { $ne: excludeId } }
        : { slug: nextSlug },
      { projection: { _id: 1 } }
    )

    if (!existingField) {
      return nextSlug
    }

    nextSlug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

const validateAdminFieldPayload = (payload) => {
  const name = String(payload?.name || "").trim()
  const address = String(payload?.address || "").trim()
  const district = String(payload?.district || "").trim()
  const type = normalizeFieldType(payload?.type)
  const openHours = String(payload?.openHours || "").trim()
  const pricePerHour = Math.round(Number(payload?.pricePerHour || 0))

  if (!name || !address || !district || !type || !openHours || !pricePerHour) {
    return "Vui lòng nhập đầy đủ thông tin sân."
  }

  if (!isSupportedFieldType(type)) {
    return "Loại sân chỉ hỗ trợ Sân 5, Sân 7, Sân 11 hoặc Futsal."
  }

  if (!parseFieldOpenHours(openHours)) {
    return "Giờ mở cửa phải theo định dạng HH:mm - HH:mm."
  }

  if (!Number.isFinite(pricePerHour) || pricePerHour <= 0) {
    return "Giá sân phải lớn hơn 0."
  }

  const subFields = normalizeAdminSubFieldsPayload(payload?.subFields, {
    type,
    openHours,
    pricePerHour,
  })
  if (subFields.length === 0) {
    return "Vui lòng tạo ít nhất 1 sân con."
  }

  const hasInvalidSubField = subFields.some(
    (subField) =>
      !String(subField.name || "").trim()
      || !isSupportedFieldType(subField.type)
      || Number(subField.pricePerHour || 0) <= 0
  )
  if (hasInvalidSubField) {
    return "Mỗi sân con cần có tên, loại Sân 5, Sân 7, Sân 11 hoặc Futsal, và giá theo giờ hợp lệ."
  }

  return ""
}

const buildAdminFieldDocumentPatch = (payload, currentUser, slug) => {
  const coverImage = String(payload?.coverImage || "").trim() || DEFAULT_FIELD_COVER_IMAGE
  const images = normalizeStringArray(payload?.images)
  const normalizedType = normalizeFieldType(payload?.type, DEFAULT_FIELD_TYPE)
  const normalizedOpenHours = String(payload?.openHours || "").trim()
  const normalizedPricePerHour = Math.round(Number(payload?.pricePerHour || 0))
  const normalizedSubFields = normalizeAdminSubFieldsPayload(payload?.subFields, {
    type: normalizedType,
    openHours: normalizedOpenHours,
    pricePerHour: normalizedPricePerHour,
  })

  return {
    name: String(payload?.name || "").trim(),
    slug,
    address: String(payload?.address || "").trim(),
    district: String(payload?.district || "").trim(),
    type: normalizedType,
    openHours: normalizedOpenHours,
    pricePerHour: normalizedPricePerHour,
    rating: Math.max(Number(payload?.rating || 5), 0),
    coverImage,
    article: String(payload?.article || "").trim() || DEFAULT_FIELD_ARTICLE,
    images: images.length > 0 ? images : getDefaultAdminFieldImages(coverImage),
    subFields:
      normalizedSubFields.length > 0
        ? normalizedSubFields
        : [createSubField("san-1", "San 1", payload)],
    ownerUserId: String(currentUser?._id || ""),
    ownerFullName: String(currentUser?.fullName || "").trim(),
    updatedAt: new Date(),
  }
}

const mapMongoErrorMessage = (error, fallbackMessage) => {
  if (!error || typeof error !== "object") {
    return fallbackMessage
  }

  const message = `${error.name || ""} ${error.message || ""}`.toLowerCase()
  if (
    message.includes("econnrefused")
    || message.includes("server selection")
    || message.includes("topology")
    || message.includes("connection")
  ) {
    return "Không thể kết nối đến MongoDB. Vui lòng khởi động MongoDB."
  }

  return fallbackMessage
}

const isMongoConnectionError = (error) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const message = `${error.name || ""} ${error.message || ""}`.toLowerCase()
  return (
    message.includes("econnrefused")
    || message.includes("server selection")
    || message.includes("topology")
    || message.includes("connection")
  )
}

const getFallbackDirectoryUsers = () => getDirectorySeedUsers().map(sanitizeDirectoryUser)

const isStaticTransferConfigured = () =>
  Boolean(
    STATIC_TRANSFER_ACCOUNT_NUMBER
    && STATIC_TRANSFER_ACCOUNT_NAME
    && (STATIC_TRANSFER_BANK_NAME || STATIC_TRANSFER_BANK_CODE)
  )

const isVnpayConfigured = () => Boolean(VNPAY_TMN_CODE && VNPAY_HASH_SECRET)

const isMomoConfigured = () =>
  Boolean(MOMO_PARTNER_CODE && MOMO_ACCESS_KEY && MOMO_SECRET_KEY)

const buildStaticTransferNote = (bookingId) => {
  const compactBookingId = String(bookingId || "").trim().slice(-10)
  return [STATIC_TRANSFER_NOTE_PREFIX || "DATCOC", compactBookingId]
    .filter(Boolean)
    .join("-")
}

const buildPaymentMethods = (booking, field = null) => {
  const paymentState = getBookingPaymentState(booking, field)
  const paidMessage = "Đơn đặt sân này đã được ghi nhận đặt cọc."

  return {
    staticTransfer: {
      enabled: !paymentState.depositPaid && isStaticTransferConfigured(),
      message: paymentState.depositPaid
        ? paidMessage
        : isStaticTransferConfigured()
          ? ""
          : "Chưa cấu hình thông tin chuyển khoản/QR tĩnh.",
    },
    vnpay: {
      enabled: !paymentState.depositPaid && isVnpayConfigured(),
      message: paymentState.depositPaid
        ? paidMessage
        : isVnpayConfigured()
          ? ""
          : "Chưa cấu hình thông tin VNPAY.",
    },
    momo: {
      enabled: !paymentState.depositPaid && isMomoConfigured(),
      message: paymentState.depositPaid
        ? paidMessage
        : isMomoConfigured()
          ? ""
          : "Chưa cấu hình thông tin MoMo.",
    },
  }
}

const buildStaticTransferInfo = (booking, field = null) => {
  const paymentState = getBookingPaymentState(booking, field)
  const bookingId = String(booking?._id || booking?.id || "")

  return {
    enabled: isStaticTransferConfigured(),
    bankName: STATIC_TRANSFER_BANK_NAME || null,
    bankCode: STATIC_TRANSFER_BANK_CODE || null,
    accountNumber: STATIC_TRANSFER_ACCOUNT_NUMBER || null,
    accountName: STATIC_TRANSFER_ACCOUNT_NAME || null,
    qrImageUrl: STATIC_TRANSFER_QR_IMAGE_URL || null,
    transferNote: buildStaticTransferNote(bookingId),
    amount: paymentState.depositAmount,
  }
}

const createPaymentOrderReference = (provider, bookingId) =>
  `${String(provider || "PAY").trim().toUpperCase()}_${String(bookingId || "").trim()}_${Date.now()}`

const extractBookingIdFromPaymentReference = (reference) => {
  const match = String(reference || "")
    .trim()
    .match(/^[A-Z]+_([a-f0-9]{24})_\d+$/i)

  return match ? match[1] : null
}

const buildClientDepositUrl = (bookingId, params = {}) => {
  const url = new URL(`/thanh-toan-dat-coc/${bookingId}`, PRIMARY_CLIENT_ORIGIN)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

const buildClientBookingsUrl = (params = {}) => {
  const url = new URL("/dat-san", PRIMARY_CLIENT_ORIGIN)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

const buildFieldProjection = () => ({
  _id: 0,
  id: 1,
  name: 1,
  slug: 1,
  address: 1,
  district: 1,
  type: 1,
  openHours: 1,
  pricePerHour: 1,
  rating: 1,
  coverImage: 1,
  subFields: 1,
  ownerUserId: 1,
  ownerFullName: 1,
})

const getBookingAndFieldById = async (bookingId, userId = null) => {
  const objectId = toObjectId(bookingId)
  if (!objectId) {
    return { booking: null, field: null }
  }

  const bookingsCollection = await getBookingsCollection()
  const bookingQuery = { _id: objectId }

  if (userId) {
    bookingQuery.userId = userId
  }

  const booking = await bookingsCollection.findOne(bookingQuery)
  if (!booking) {
    return { booking: null, field: null }
  }

  const fieldsCollection = await getFieldsCollection()
  const field = await fieldsCollection.findOne(
    { id: booking.fieldId },
    { projection: buildFieldProjection() }
  )

  return {
    booking,
    field: field || null,
  }
}

const setBookingDepositState = async (bookingId, patch) => {
  const objectId = toObjectId(bookingId)
  if (!objectId) {
    return null
  }

  const bookingsCollection = await getBookingsCollection()
  const currentBooking = await bookingsCollection.findOne({ _id: objectId })
  if (!currentBooking) {
    return null
  }

  const nextPatch = {
    ...patch,
    updatedAt: new Date(),
  }

  if (currentBooking.depositPaid && patch.depositPaid === false) {
    delete nextPatch.depositPaid
    delete nextPatch.depositStatus
    delete nextPatch.depositPaidAt
    delete nextPatch.depositMethod
    delete nextPatch.depositReference
  }

  if (patch.depositPaid === true && !currentBooking.depositPaidAt && !nextPatch.depositPaidAt) {
    nextPatch.depositPaidAt = new Date()
  }

  await bookingsCollection.updateOne(
    { _id: objectId },
    { $set: nextPatch }
  )

  return {
    ...currentBooking,
    ...nextPatch,
  }
}

const setBookingStatusState = async (bookingId, patch) => {
  const objectId = toObjectId(bookingId)
  if (!objectId) {
    return null
  }

  const bookingsCollection = await getBookingsCollection()
  const currentBooking = await bookingsCollection.findOne({ _id: objectId })
  if (!currentBooking) {
    return null
  }

  const nextPatch = {
    ...patch,
    updatedAt: new Date(),
  }

  await bookingsCollection.updateOne({ _id: objectId }, { $set: nextPatch })

  return {
    ...currentBooking,
    ...nextPatch,
  }
}

const padDatePart = (value) => String(value).padStart(2, "0")

const getTodayBookingDate = (now = new Date()) => {
  const localDate = new Date(now)
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
  return localDate.toISOString().slice(0, 10)
}

const formatMonthKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`

const formatMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey || "").split("-")
  if (!year || !month) {
    return String(monthKey || "")
  }

  return `${month}/${year}`
}

const getRecentMonthKeys = (count = 6, now = new Date()) => {
  const safeCount = Math.max(1, Math.min(Number(count || 0), 12))
  const monthKeys = []

  for (let offset = safeCount - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    monthKeys.push(formatMonthKey(cursor))
  }

  return monthKeys
}

const getBookingCustomerKey = (booking) => {
  const userId = String(booking?.userId || "").trim()
  if (userId) {
    return `user:${userId}`
  }

  const phone = normalizePhoneNumber(booking?.phone)
  if (phone) {
    return `phone:${phone}`
  }

  return `booking:${String(booking?._id || "")}`
}

const buildAdminCustomerLabel = (customer, booking) =>
  String(customer?.fullName || "").trim()
  || String(booking?.phone || "").trim()
  || "Khach hang"

const sanitizeAdminBooking = (booking, field = null, customer = null) => ({
  ...sanitizeMongoBooking(booking, field),
  fieldSlug: String(field?.slug || "").trim(),
  fieldAddress: String(field?.address || "").trim(),
  fieldDistrict: String(field?.district || "").trim(),
  customer: {
    id: customer?._id ? String(customer._id) : String(booking?.userId || ""),
    fullName: buildAdminCustomerLabel(customer, booking),
    email: String(customer?.email || "").trim(),
    phone: normalizePhoneNumber(booking?.phone),
    createdAt: customer?.createdAt || null,
  },
  confirmedAt: booking?.confirmedAt || null,
  cancelledAt: booking?.cancelledAt || null,
  updatedAt: booking?.updatedAt || null,
})

const getBookingStatusWeight = (status) => {
  switch (String(status || "").trim().toLowerCase()) {
    case "pending":
      return 0
    case "confirmed":
      return 1
    case "cancelled":
      return 2
    default:
      return 3
  }
}

const getBookingDateSortValue = (booking) => {
  const bookingDate = parseBookingDate(booking?.date)
  const startMinutes = parseTimeSlot(booking?.timeSlot)?.startMinutes || 0

  return bookingDate ? bookingDate.getTime() + startMinutes * 60 * 1000 : 0
}

const buildAdminDashboardStats = (ownedFields, bookings) => {
  const stats = {
    totalFields: ownedFields.length,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    totalDepositsPaid: 0,
  }
  const uniqueCustomerKeys = new Set()

  bookings.forEach((booking) => {
    const status = String(booking?.status || "").trim().toLowerCase()
    const paymentState = getBookingPaymentState(booking)

    stats.totalBookings += 1
    uniqueCustomerKeys.add(getBookingCustomerKey(booking))

    if (status === "pending") {
      stats.pendingBookings += 1
    }

    if (status === "confirmed") {
      stats.confirmedBookings += 1
    }

    if (status === "cancelled") {
      stats.cancelledBookings += 1
    }

    if (status !== "cancelled") {
      stats.totalRevenue += paymentState.totalPrice
    }

    if (paymentState.depositPaid) {
      stats.totalDepositsPaid += paymentState.depositAmount
    }
  })

  stats.totalCustomers = uniqueCustomerKeys.size
  return stats
}

const buildAdminFieldAvailability = (ownedFields, bookings, selectedDate, customerById = new Map()) => {
  const blockingBookings = bookings.filter((booking) => {
    const status = String(booking?.status || "").trim().toLowerCase()
    return booking?.date === selectedDate && BLOCKING_BOOKING_STATUSES.includes(status)
  })

  return ownedFields
    .map((field) => {
      const fieldBookings = blockingBookings.filter(
        (booking) => Number(booking?.fieldId) === Number(field?.id)
      )
      const subFields = getNormalizedFieldSubFields(field).map((subField) => {
        const subFieldBookings = fieldBookings
          .filter((booking) => doesBookingBlockSubField(booking, subField.key))
          .sort((left, right) => getBookingDateSortValue(left) - getBookingDateSortValue(right))
          .map((booking) => ({
            id: String(booking._id),
            timeSlot: booking.timeSlot,
            status: booking.status,
            customerName: buildAdminCustomerLabel(
              customerById.get(String(booking?.userId || "")),
              booking
            ),
            phone: normalizePhoneNumber(booking?.phone),
          }))

        return {
          key: subField.key,
          name: subField.name,
          type: String(subField.type || "").trim(),
          pricePerHour: Number(subField.pricePerHour || 0),
          isAvailable: subFieldBookings.length === 0,
          bookings: subFieldBookings,
        }
      })

      return {
        id: Number(field.id),
        name: String(field.name || "").trim(),
        slug: String(field.slug || "").trim(),
        address: String(field.address || "").trim(),
        district: String(field.district || "").trim(),
        openHours: String(field.openHours || "").trim(),
        totalSubFields: subFields.length,
        availableSubFields: subFields.filter((subField) => subField.isAvailable).length,
        bookingCount: fieldBookings.length,
        subFields,
      }
    })
    .sort((left, right) => {
      if (left.availableSubFields !== right.availableSubFields) {
        return left.availableSubFields - right.availableSubFields
      }

      return left.name.localeCompare(right.name)
    })
}

const buildAdminMonthlyCustomerStats = (bookings, months = 6) => {
  const monthKeys = getRecentMonthKeys(months)
  const monthlyMap = new Map(
    monthKeys.map((monthKey) => [
      monthKey,
      {
        monthKey,
        label: formatMonthLabel(monthKey),
        uniqueCustomerKeys: new Set(),
        bookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        revenue: 0,
      },
    ])
  )

  bookings.forEach((booking) => {
    const bookingDate = parseBookingDate(booking?.date)
    if (!bookingDate) {
      return
    }

    const monthKey = formatMonthKey(bookingDate)
    const entry = monthlyMap.get(monthKey)
    if (!entry) {
      return
    }

    const status = String(booking?.status || "").trim().toLowerCase()
    const paymentState = getBookingPaymentState(booking)

    entry.uniqueCustomerKeys.add(getBookingCustomerKey(booking))
    entry.bookings += 1

    if (status === "confirmed") {
      entry.confirmedBookings += 1
    }

    if (status === "cancelled") {
      entry.cancelledBookings += 1
    }

    if (status !== "cancelled") {
      entry.revenue += paymentState.totalPrice
    }
  })

  return monthKeys.map((monthKey) => {
    const entry = monthlyMap.get(monthKey)

    return {
      monthKey,
      label: entry.label,
      uniqueCustomers: entry.uniqueCustomerKeys.size,
      bookings: entry.bookings,
      confirmedBookings: entry.confirmedBookings,
      cancelledBookings: entry.cancelledBookings,
      revenue: entry.revenue,
    }
  })
}

const buildAdminCustomerSummaries = (bookings, customerById = new Map(), fieldById = new Map()) => {
  const summaryMap = new Map()

  bookings.forEach((booking) => {
    const customerKey = getBookingCustomerKey(booking)
    const customer = customerById.get(String(booking?.userId || "")) || null
    const field = fieldById.get(Number(booking?.fieldId)) || null
    const paymentState = getBookingPaymentState(booking, field)
    const status = String(booking?.status || "").trim().toLowerCase()
    const bookingCreatedAt = booking?.createdAt ? new Date(booking.createdAt) : null
    const currentSummary =
      summaryMap.get(customerKey) || {
        key: customerKey,
        id: customer?._id ? String(customer._id) : String(booking?.userId || ""),
        fullName: buildAdminCustomerLabel(customer, booking),
        email: String(customer?.email || "").trim(),
        phone: normalizePhoneNumber(booking?.phone),
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        totalSpent: 0,
        lastBookingAt: null,
        lastFieldName: "",
        lastTimeSlot: "",
        lastDate: "",
        lastStatus: "",
      }

    currentSummary.totalBookings += 1

    if (status === "confirmed") {
      currentSummary.confirmedBookings += 1
    }

    if (status === "cancelled") {
      currentSummary.cancelledBookings += 1
    }

    if (status !== "cancelled") {
      currentSummary.totalSpent += paymentState.totalPrice
    }

    if (!currentSummary.phone) {
      currentSummary.phone = normalizePhoneNumber(booking?.phone)
    }

    if (!currentSummary.lastBookingAt || (bookingCreatedAt && bookingCreatedAt > new Date(currentSummary.lastBookingAt))) {
      currentSummary.lastBookingAt = booking?.createdAt || null
      currentSummary.lastFieldName = String(field?.name || booking?.fieldName || "").trim()
      currentSummary.lastTimeSlot = String(booking?.timeSlot || "").trim()
      currentSummary.lastDate = String(booking?.date || "").trim()
      currentSummary.lastStatus = status
    }

    summaryMap.set(customerKey, currentSummary)
  })

  return Array.from(summaryMap.values())
    .sort((left, right) => {
      const leftTime = left.lastBookingAt ? new Date(left.lastBookingAt).getTime() : 0
      const rightTime = right.lastBookingAt ? new Date(right.lastBookingAt).getTime() : 0

      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return right.totalBookings - left.totalBookings
    })
    .slice(0, 10)
}

const buildAdminDashboardData = async (adminUser, options = {}) => {
  const selectedDate = parseBookingDate(options.date)
    ? String(options.date).trim()
    : getTodayBookingDate()
  const monthWindow = Math.max(3, Math.min(Number(options.months || 6), 12))

  const fieldsCollection = await getFieldsCollection()
  const ownedFields = await fieldsCollection
    .find(
      { ownerUserId: String(adminUser._id) },
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          slug: 1,
          ownerUserId: 1,
          ownerFullName: 1,
          address: 1,
          district: 1,
          type: 1,
          openHours: 1,
          pricePerHour: 1,
          rating: 1,
          coverImage: 1,
          subFields: 1,
          article: 1,
          images: 1,
          createdAt: 1,
        },
      }
    )
    .sort({ createdAt: -1, id: -1 })
    .toArray()

  const fieldIds = ownedFields.map((field) => Number(field.id)).filter(Number.isInteger)
  const bookingsCollection = await getBookingsCollection()
  const bookingRows = fieldIds.length > 0
    ? await bookingsCollection.find({ fieldId: { $in: fieldIds } }).sort({ createdAt: -1 }).toArray()
    : []

  const uniqueUserIds = Array.from(
    new Set(
      bookingRows
        .map((booking) => String(booking?.userId || "").trim())
        .filter(Boolean)
    )
  )
  const userObjectIds = uniqueUserIds.map((userId) => toObjectId(userId)).filter(Boolean)
  const customerById = new Map()

  if (userObjectIds.length > 0) {
    const usersCollection = await getUsersCollection()
    const customerRows = await usersCollection
      .find(
        { _id: { $in: userObjectIds } },
        { projection: { fullName: 1, email: 1, createdAt: 1 } }
      )
      .toArray()

    customerRows.forEach((customer) => {
      customerById.set(String(customer._id), customer)
    })
  }

  const normalizedFields = ownedFields.map((field) => getNormalizedFieldByDocument(field))
  const fieldById = new Map(normalizedFields.map((field) => [Number(field.id), field]))
  const recentBookings = bookingRows.slice(0, 8).map((booking) =>
    sanitizeAdminBooking(
      booking,
      fieldById.get(Number(booking?.fieldId)) || null,
      customerById.get(String(booking?.userId || "")) || null
    )
  )
  const managedBookings = [...bookingRows]
    .sort((left, right) => {
      const weightDiff =
        getBookingStatusWeight(left?.status) - getBookingStatusWeight(right?.status)
      if (weightDiff !== 0) {
        return weightDiff
      }

      const scheduleDiff = getBookingDateSortValue(left) - getBookingDateSortValue(right)
      if (scheduleDiff !== 0) {
        return scheduleDiff
      }

      return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime()
    })
    .slice(0, 24)
    .map((booking) =>
      sanitizeAdminBooking(
        booking,
        fieldById.get(Number(booking?.fieldId)) || null,
        customerById.get(String(booking?.userId || "")) || null
      )
    )

  return {
    stats: buildAdminDashboardStats(ownedFields, bookingRows),
    recentBookings,
    managedBookings,
    availabilityDate: selectedDate,
    dailyAvailability: buildAdminFieldAvailability(
      normalizedFields,
      bookingRows,
      selectedDate,
      customerById
    ),
    customerMonthlyStats: buildAdminMonthlyCustomerStats(bookingRows, monthWindow),
    customerSummaries: buildAdminCustomerSummaries(bookingRows, customerById, fieldById),
  }
}

const getRequestIpAddress = (req) => {
  const rawIp = String(req.headers["x-forwarded-for"] || req.ip || "")
    .split(",")[0]
    .trim()

  if (!rawIp || rawIp === "::1") {
    return "127.0.0.1"
  }

  if (rawIp.startsWith("::ffff:")) {
    return rawIp.replace("::ffff:", "")
  }

  return rawIp
}

const padVnpayDatePart = (value) => String(value).padStart(2, "0")

const formatVnpayDate = (date = new Date()) =>
  `${date.getFullYear()}${padVnpayDatePart(date.getMonth() + 1)}${padVnpayDatePart(
    date.getDate()
  )}${padVnpayDatePart(date.getHours())}${padVnpayDatePart(date.getMinutes())}${padVnpayDatePart(
    date.getSeconds()
  )}`

const buildVnpayQueryString = (params) =>
  Object.keys(params)
    .sort()
    .map((key) => {
      const encodedKey = encodeURIComponent(key)
      const encodedValue = encodeURIComponent(String(params[key])).replace(/%20/g, "+")
      return `${encodedKey}=${encodedValue}`
    })
    .join("&")

const signVnpayParams = (params) =>
  crypto
    .createHmac("sha512", VNPAY_HASH_SECRET)
    .update(buildVnpayQueryString(params), "utf8")
    .digest("hex")

const verifyVnpayCallback = (queryParams) => {
  const params = { ...queryParams }
  const providedSecureHash = String(params.vnp_SecureHash || "")

  delete params.vnp_SecureHash
  delete params.vnp_SecureHashType

  if (!providedSecureHash || !isVnpayConfigured()) {
    return false
  }

  const expectedSecureHash = signVnpayParams(params)
  return expectedSecureHash.toLowerCase() === providedSecureHash.toLowerCase()
}

const signMomoText = (value) =>
  crypto.createHmac("sha256", MOMO_SECRET_KEY).update(value, "utf8").digest("hex")

const buildMomoCreateSignaturePayload = (params) =>
  `accessKey=${MOMO_ACCESS_KEY}&amount=${params.amount}&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}&requestId=${params.requestId}&requestType=${params.requestType}`

const buildMomoCreateResponseSignaturePayload = (responseData) =>
  `accessKey=${MOMO_ACCESS_KEY}&amount=${responseData.amount}&orderId=${responseData.orderId}&partnerCode=${responseData.partnerCode}&payUrl=${responseData.payUrl}&requestId=${responseData.requestId}&responseTime=${responseData.responseTime}&resultCode=${responseData.resultCode}`

const buildMomoCallbackSignaturePayload = (params) =>
  `accessKey=${MOMO_ACCESS_KEY}&amount=${params.amount}&extraData=${params.extraData || ""}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${params.orderType}&partnerCode=${params.partnerCode}&payType=${params.payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${params.transId}`

const verifyMomoSignature = (params, buildSignaturePayload) => {
  const providedSignature = String(params?.signature || "")
  if (!providedSignature || !isMomoConfigured()) {
    return false
  }

  const expectedSignature = signMomoText(buildSignaturePayload(params))
  return expectedSignature.toLowerCase() === providedSignature.toLowerCase()
}

app.get("/api/health", async (_req, res) => {
  const checks = {}

  try {
    const db = await getMongoDb()
    await db.command({ ping: 1 })
    checks.mongodb = "ok"
  } catch (error) {
    checks.mongodb = mapMongoErrorMessage(error, "MongoDB chưa sẵn sàng.")
  }

  if (checks.mongodb !== "ok") {
    return res.status(500).json({
      status: "error",
      checks,
      date: new Date().toISOString(),
    })
  }

  return res.json({
    status: "ok",
    checks,
    date: new Date().toISOString(),
  })
})

app.get(["/users", "/api/users"], async (_req, res) => {
  try {
    const usersCollection = await getUsersCollection()
    const users = await usersCollection
      .find(
        { directoryVisible: true },
        { projection: { _id: 0, id: 1, name: 1, fullName: 1 } }
      )
      .sort({ id: 1 })
      .toArray()

    return res.json(users.map(sanitizeDirectoryUser))
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return res.json(getFallbackDirectoryUsers())
    }

    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể lấy danh sách người dùng."),
    })
  }
})

app.get(["/users/:id", "/api/users/:id"], async (req, res) => {
  const userId = parseDirectoryUserId(req.params.id)
  if (!userId) {
    return res.status(400).json({ message: "ID người dùng không hợp lệ." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne(
      { id: userId, directoryVisible: true },
      { projection: { _id: 0, id: 1, name: 1, fullName: 1 } }
    )

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." })
    }

    return res.json(sanitizeDirectoryUser(user))
  } catch (error) {
    if (isMongoConnectionError(error)) {
      const fallbackUser =
        getFallbackDirectoryUsers().find((user) => user.id === userId) || null

      if (!fallbackUser) {
        return res.status(404).json({ message: "Không tìm thấy người dùng." })
      }

      return res.json(fallbackUser)
    }

    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể lấy thông tin người dùng."),
    })
  }
})

app.post(["/users", "/api/users"], async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const name = String(body.name || "").trim()

  if (!name) {
    return res.status(400).json({ message: "Vui lòng nhập tên người dùng." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const userId = await getNextSequenceValue("directory_users")
    const newUser = await createDirectoryUserDocument(userId, name)

    await usersCollection.insertOne(newUser)

    return res.status(201).json(sanitizeDirectoryUser(newUser))
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "ID người dùng đã tồn tại." })
    }

    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tạo người dùng mới."),
    })
  }
})

const updateDirectoryUser = async (req, res) => {
  const userId = parseDirectoryUserId(req.params.id)
  if (!userId) {
    return res.status(400).json({ message: "ID người dùng không hợp lệ." })
  }

  const body = req.body && typeof req.body === "object" ? req.body : {}
  const name = String(body.name || "").trim()

  if (!name) {
    return res.status(400).json({ message: "Vui lòng nhập tên người dùng." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const updateResult = await usersCollection.updateOne(
      { id: userId, directoryVisible: true },
      {
        $set: {
          name,
          fullName: name,
          updatedAt: new Date(),
        },
      }
    )

    if (!updateResult.matchedCount) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." })
    }

    const updatedUser = await usersCollection.findOne(
      { id: userId, directoryVisible: true },
      { projection: { _id: 0, id: 1, name: 1, fullName: 1 } }
    )

    return res.json(sanitizeDirectoryUser(updatedUser))
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể cập nhật người dùng."),
    })
  }
}

app.put(["/users/:id", "/api/users/:id"], updateDirectoryUser)
app.patch(["/users/:id", "/api/users/:id"], updateDirectoryUser)

app.delete(["/users/:id", "/api/users/:id"], async (req, res) => {
  const userId = parseDirectoryUserId(req.params.id)
  if (!userId) {
    return res.status(400).json({ message: "ID người dùng không hợp lệ." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const existingUser = await usersCollection.findOne({
      id: userId,
      directoryVisible: true,
    })

    if (!existingUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." })
    }

    await usersCollection.deleteOne({ _id: existingUser._id })

    return res.json(sanitizeDirectoryUser(existingUser))
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể xóa người dùng."),
    })
  }
})

app.post("/api/auth/request-register-otp", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const email = String(body.email || "").trim().toLowerCase()

  if (!email) {
    return res.status(400).json({ message: "Vui lòng nhập email." })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Email không hợp lệ." })
  }

  if (!isEmailConfigured()) {
    return res.status(500).json({
      message:
        "Dịch vụ gửi email chưa được cấu hình. Vui lòng kiểm tra MAIL_PROVIDER và biến môi trường mail.",
    })
  }

  try {
    const usersCollection = await getUsersCollection()
    const emailOtpsCollection = await getEmailOtpsCollection()

    const existedUser = await usersCollection.findOne(
      { email },
      { projection: { _id: 1 } }
    )
    if (existedUser) {
      return res.status(409).json({ message: "Email đã được đăng ký." })
    }

    const latestOtp = await emailOtpsCollection.findOne(
      { email, purpose: "register" },
      { sort: { createdAt: -1 } }
    )

    if (latestOtp?.createdAt) {
      const secondsSinceLastOtp = Math.floor(
        (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000
      )
      if (secondsSinceLastOtp < OTP_RESEND_SECONDS) {
        const waitSeconds = OTP_RESEND_SECONDS - secondsSinceLastOtp
        return res.status(429).json({
          message: `Vui lòng đợi ${waitSeconds}s trước khi gửi mã mới.`,
        })
      }
    }

    const otpCode = generateOtpCode()
    const otpHash = await bcrypt.hash(otpCode, 10)
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000)

    const insertResult = await emailOtpsCollection.insertOne({
      email,
      purpose: "register",
      otpHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    })

    try {
      await sendRegisterOtpEmail({
        to: email,
        otpCode,
        expiresMinutes: OTP_EXPIRES_MINUTES,
      })
    } catch (error) {
      await emailOtpsCollection.deleteOne({ _id: insertResult.insertedId })
      return res.status(500).json({ message: "Không thể gửi mã xác nhận qua email." })
    }

    return res.json({
      message: "Đã gửi mã xác nhận về email. Vui lòng kiểm tra hộp thư.",
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể gửi mã xác nhận lúc này."),
    })
  }
})

app.post("/api/auth/register", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const fullName = String(body.fullName || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "").trim()
  const otp = String(body.otp || "").trim()
  const role = normalizeUserRole(body.role)

  if (!fullName || !email || !password || !otp) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin và mã OTP." })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Email không hợp lệ." })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const emailOtpsCollection = await getEmailOtpsCollection()

    const existedUser = await usersCollection.findOne(
      { email },
      { projection: { _id: 1 } }
    )
    if (existedUser) {
      return res.status(409).json({ message: "Email đã được đăng ký." })
    }

    const latestOtp = await emailOtpsCollection.findOne(
      { email, purpose: "register", usedAt: null },
      { sort: { createdAt: -1 } }
    )

    if (!latestOtp) {
      return res.status(400).json({
        message: "Không tìm thấy mã OTP hợp lệ. Vui lòng gửi lại mã.",
      })
    }

    if (new Date(latestOtp.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." })
    }

    const isOtpMatch = await bcrypt.compare(otp, latestOtp.otpHash)
    if (!isOtpMatch) {
      return res.status(400).json({ message: "Mã OTP không đúng." })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const insertResult = await usersCollection.insertOne({
      fullName,
      email,
      passwordHash,
      role,
      createdAt: new Date(),
    })

    await emailOtpsCollection.updateOne(
      { _id: latestOtp._id, usedAt: null },
      { $set: { usedAt: new Date() } }
    )

    const newUser = await usersCollection.findOne({ _id: insertResult.insertedId })

    return res.status(201).json({
      message: "Đăng ký thành công.",
      user: sanitizeMongoUser(newUser),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email đã được đăng ký." })
    }

    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể đăng ký lúc này."),
    })
  }
})

app.post("/api/auth/login", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "").trim()

  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." })
    }

    const passwordHash = getComparablePasswordHash(user)
    if (!passwordHash) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." })
    }

    const isPasswordMatch = await bcrypt.compare(password, passwordHash)
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Thông tin đăng nhập không đúng." })
    }

    const safeUser = sanitizeMongoUser(user)
    const token = createToken(safeUser)

    return res.json({
      message: "Đăng nhập thành công.",
      token,
      user: safeUser,
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể đăng nhập lúc này."),
    })
  }
})

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const userId = toObjectId(req.auth.sub)
  if (!userId) {
    return res.status(404).json({ message: "Không tìm thấy người dùng." })
  }

  try {
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne({ _id: userId })
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." })
    }

    return res.json({ user: sanitizeMongoUser(user) })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể lấy thông tin tài khoản."),
    })
  }
})

app.get("/api/fields", async (_req, res) => {
  try {
    const fieldsCollection = await getFieldsCollection()
    const fields = await fieldsCollection
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            slug: 1,
            address: 1,
            district: 1,
            type: 1,
            openHours: 1,
            pricePerHour: 1,
            rating: 1,
            coverImage: 1,
            subFields: 1,
            ownerUserId: 1,
            ownerFullName: 1,
          },
        }
      )
      .sort({ id: 1 })
      .toArray()

    return res.json({ fields: fields.map((field) => sanitizeMongoField(field)) })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải danh sách sân."),
    })
  }
})

app.get("/api/fields/:id", async (req, res) => {
  const fieldId = parseFieldId(req.params.id)
  if (fieldId === null) {
    return res.status(400).json({ message: "ID sân không hợp lệ." })
  }

  try {
    const fieldsCollection = await getFieldsCollection()
    const field = await fieldsCollection.findOne(
      { id: fieldId },
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          slug: 1,
          address: 1,
          district: 1,
          type: 1,
          openHours: 1,
          pricePerHour: 1,
          rating: 1,
          coverImage: 1,
          subFields: 1,
          article: 1,
          images: 1,
          ownerUserId: 1,
          ownerFullName: 1,
        },
      }
    )

    if (!field) {
      return res.status(404).json({ message: "Không tìm thấy sân." })
    }

    return res.json({ field: sanitizeMongoField(field, true) })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải chi tiết sân."),
    })
  }
})

app.get("/api/admin/fields", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  try {
    const fieldsCollection = await getFieldsCollection()
    const fields = await fieldsCollection
      .find(
        { ownerUserId: String(req.currentUser._id) },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            slug: 1,
            address: 1,
            district: 1,
            type: 1,
            openHours: 1,
            pricePerHour: 1,
            rating: 1,
            coverImage: 1,
            subFields: 1,
            article: 1,
            images: 1,
            ownerUserId: 1,
            ownerFullName: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1, id: -1 })
      .toArray()

    return res.json({
      fields: fields.map((field) => sanitizeMongoField(field, true)),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải danh sách sân của quản trị viên."),
    })
  }
})

app.get("/api/admin/dashboard", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  try {
    const dashboardData = await buildAdminDashboardData(req.currentUser, {
      date: req.query.date,
      months: req.query.months,
    })

    return res.json(dashboardData)
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải bảng điều khiển quản trị."),
    })
  }
})

app.get("/api/admin/contacts", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (_req, res) => {
  try {
    const contactsCollection = await getContactsCollection()
    const contacts = await contactsCollection
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            email: 1,
            phone: 1,
            message: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1, id: -1 })
      .limit(30)
      .toArray()

    return res.json({
      contacts: contacts.map((contact) => sanitizeMongoContact(contact)),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch liÃªn há»‡."),
    })
  }
})

app.delete("/api/admin/contacts/:id", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  const contactId = parseContactId(req.params.id)

  if (contactId === null) {
    return res.status(400).json({ message: "ID liÃªn há»‡ khÃ´ng há»£p lá»‡." })
  }

  try {
    const contactsCollection = await getContactsCollection()
    const existingContact = await contactsCollection.findOne(
      { id: contactId },
      { projection: { _id: 1 } }
    )

    if (!existingContact) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y liÃªn há»‡ cáº§n xÃ³a." })
    }

    await contactsCollection.deleteOne({ _id: existingContact._id })

    return res.json({
      message: "ÄÃ£ xÃ³a liÃªn há»‡.",
      deletedContactId: contactId,
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "KhÃ´ng thá»ƒ xÃ³a liÃªn há»‡."),
    })
  }
})

app.post("/api/admin/bookings/:id/confirm", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  try {
    const { booking, field } = await getBookingAndFieldById(req.params.id)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt cần xác nhận." })
    }

    if (!field || String(field.ownerUserId || "") !== String(req.currentUser._id)) {
      return res.status(403).json({ message: "Đơn đặt này không thuộc sân của bạn." })
    }

    const currentStatus = String(booking.status || "").trim().toLowerCase()
    if (currentStatus === "cancelled") {
      return res.status(409).json({ message: "Đơn đặt đã bị hủy, không thể xác nhận lại." })
    }

    const updatedBooking =
      currentStatus === "confirmed"
        ? booking
        : await setBookingStatusState(req.params.id, {
            status: "confirmed",
            confirmedAt: new Date(),
            confirmedByUserId: String(req.currentUser._id),
          })

    const customerId = toObjectId(updatedBooking?.userId)
    const usersCollection = await getUsersCollection()
    const customer = customerId
      ? await usersCollection.findOne(
          { _id: customerId },
          { projection: { fullName: 1, email: 1, createdAt: 1 } }
        )
      : null

    return res.json({
      message: currentStatus === "confirmed" ? "Đơn đặt đã được xác nhận từ trước." : "Đã xác nhận đơn đặt cho khách.",
      booking: sanitizeAdminBooking(updatedBooking, getNormalizedFieldByDocument(field), customer),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể xác nhận đơn đặt lúc này."),
    })
  }
})

app.post("/api/admin/bookings/:id/cancel", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  try {
    const { booking, field } = await getBookingAndFieldById(req.params.id)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt cần hủy." })
    }

    if (!field || String(field.ownerUserId || "") !== String(req.currentUser._id)) {
      return res.status(403).json({ message: "Đơn đặt này không thuộc sân của bạn." })
    }

    const currentStatus = String(booking.status || "").trim().toLowerCase()
    const updatedBooking =
      currentStatus === "cancelled"
        ? booking
        : await setBookingStatusState(req.params.id, {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledByUserId: String(req.currentUser._id),
          })

    const customerId = toObjectId(updatedBooking?.userId)
    const usersCollection = await getUsersCollection()
    const customer = customerId
      ? await usersCollection.findOne(
          { _id: customerId },
          { projection: { fullName: 1, email: 1, createdAt: 1 } }
        )
      : null

    return res.json({
      message: currentStatus === "cancelled" ? "Đơn đặt đã được hủy từ trước." : "Đã hủy đơn đặt cho khách.",
      booking: sanitizeAdminBooking(updatedBooking, getNormalizedFieldByDocument(field), customer),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể hủy đơn đặt lúc này."),
    })
  }
})

app.post(
  "/api/admin/uploads/images",
  authMiddleware,
  loadCurrentUserByAuth,
  adminMiddleware,
  express.raw({
    type: Object.keys(SUPPORTED_IMAGE_MIME_TYPES),
    limit: ADMIN_IMAGE_UPLOAD_LIMIT_BYTES,
  }),
  async (req, res) => {
    const mimeType = String(req.headers["content-type"] || "").trim().toLowerCase()
    const extension = getUploadExtensionFromMimeType(mimeType)

    if (!extension) {
      return res.status(400).json({
        message: "Chỉ hỗ trợ tải ảnh JPG, PNG, WEBP hoặc GIF.",
      })
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: "Không nhận được dữ liệu ảnh tải lên." })
    }

    try {
      const originalFileName = decodeUploadFileNameHeader(req.headers["x-file-name"])
      const safeBaseName = sanitizeUploadFileBaseName(originalFileName)
      const generatedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeBaseName}${extension}`
      const uploadPath = path.join(UPLOADS_DIR, generatedName)

      await fsPromises.writeFile(uploadPath, req.body)

      return res.status(201).json({
        message: "Tải ảnh lên thành công.",
        file: {
          name: generatedName,
          path: createUploadedImagePath(generatedName),
          url: createUploadedImageUrl(req, generatedName),
          mimeType,
          size: req.body.length,
        },
      })
    } catch (error) {
      return res.status(500).json({
        message: mapMongoErrorMessage(error, "Không thể tải ảnh lên lúc này."),
      })
    }
  }
)

app.post("/api/admin/fields", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const validationError = validateAdminFieldPayload(body)

  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  try {
    const fieldsCollection = await getFieldsCollection()
    const fieldId = await getNextSequenceValue("fields")
    const slug = await createUniqueFieldSlug(fieldsCollection, body.name)
    const fieldDocument = {
      id: fieldId,
      ...buildAdminFieldDocumentPatch(body, req.currentUser, slug),
      __ignoredSubFields
          : [createSubField("Sân 1", "Sân 1", body)],
      createdAt: new Date(),
    }

    delete fieldDocument.__ignoredSubFields

    await fieldsCollection.insertOne(fieldDocument)

    return res.status(201).json({
      message: "Tạo sân mới thành công.",
      field: sanitizeMongoField(fieldDocument, true),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Tên đường dẫn sân đã tồn tại." })
    }

    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tạo sân mới."),
    })
  }
})

app.put("/api/admin/fields/:id", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  const fieldId = parseFieldId(req.params.id)
  const body = req.body && typeof req.body === "object" ? req.body : {}

  if (fieldId === null) {
    return res.status(400).json({ message: "ID sÃ¢n khÃ´ng há»£p lá»‡." })
  }

  const validationError = validateAdminFieldPayload(body)
  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  try {
    const fieldsCollection = await getFieldsCollection()
    const existingField = await fieldsCollection.findOne({ id: fieldId })

    if (!existingField) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y sÃ¢n cáº§n cáº­p nháº­t." })
    }

    if (String(existingField.ownerUserId || "") !== String(req.currentUser._id)) {
      return res.status(403).json({ message: "SÃ¢n nÃ y khÃ´ng thuá»™c quyá»n quáº£n lÃ½ cá»§a báº¡n." })
    }

    const slug = await createUniqueFieldSlug(fieldsCollection, body.name, existingField._id)
    const nextPatch = buildAdminFieldDocumentPatch(body, req.currentUser, slug)
    const nextField = {
      ...existingField,
      ...nextPatch,
    }
    const previousUploadFiles = getManagedUploadFileNames(existingField)
    const nextUploadFiles = getManagedUploadFileNames(nextField)

    await fieldsCollection.updateOne({ _id: existingField._id }, { $set: nextPatch })
    await deleteManagedUploadFiles(
      previousUploadFiles.filter((fileName) => !nextUploadFiles.includes(fileName))
    )

    return res.json({
      message: "Cáº­p nháº­t sÃ¢n thÃ nh cÃ´ng.",
      field: sanitizeMongoField(nextField, true),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "TÃªn Ä‘Æ°á»ng dáº«n sÃ¢n Ä‘Ã£ tá»“n táº¡i." })
    }

    return res.status(500).json({
      message: mapMongoErrorMessage(error, "KhÃ´ng thá»ƒ cáº­p nháº­t sÃ¢n."),
    })
  }
})

app.delete("/api/admin/fields/:id", authMiddleware, loadCurrentUserByAuth, adminMiddleware, async (req, res) => {
  const fieldId = parseFieldId(req.params.id)

  if (fieldId === null) {
    return res.status(400).json({ message: "ID sÃ¢n khÃ´ng há»£p lá»‡." })
  }

  try {
    const fieldsCollection = await getFieldsCollection()
    const existingField = await fieldsCollection.findOne({ id: fieldId })

    if (!existingField) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y sÃ¢n cáº§n xÃ³a." })
    }

    if (String(existingField.ownerUserId || "") !== String(req.currentUser._id)) {
      return res.status(403).json({ message: "SÃ¢n nÃ y khÃ´ng thuá»™c quyá»n quáº£n lÃ½ cá»§a báº¡n." })
    }

    const bookingsCollection = await getBookingsCollection()
    const [fieldResult, bookingResult] = await Promise.all([
      fieldsCollection.deleteOne({ _id: existingField._id }),
      bookingsCollection.deleteMany({ fieldId }),
    ])

    if (!fieldResult.deletedCount) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y sÃ¢n cáº§n xÃ³a." })
    }

    await deleteManagedUploadFiles(getManagedUploadFileNames(existingField))

    return res.json({
      message: "ÄÃ£ xÃ³a sÃ¢n vÃ  toÃ n bá»™ Ä‘Æ¡n Ä‘áº·t liÃªn quan.",
      deletedFieldId: fieldId,
      deletedBookings: bookingResult.deletedCount || 0,
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "KhÃ´ng thá»ƒ xÃ³a sÃ¢n."),
    })
  }
})

app.post("/api/bookings", authMiddleware, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const fieldId = parseFieldId(body.fieldId)
  const subFieldKey = normalizeSubFieldKey(body.subFieldKey)
  const date = String(body.date || "").trim()
  const timeSlot = String(body.timeSlot || "").trim()
  const phone = normalizePhoneNumber(body.phone)
  const note = String(body.note || "").trim()
  const scheduleError = getBookingScheduleError(date, timeSlot)

  if (
    fieldId === null
    || !subFieldKey
    || !date
    || !timeSlot
    || !phone
    || !isValidPhoneNumber(phone)
    || Boolean(scheduleError)
  ) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin đặt sân." })
  }

  try {
    const fieldsCollection = await getFieldsCollection()
    const field = await fieldsCollection.findOne(
      { id: fieldId },
      { projection: { _id: 0, id: 1, name: 1, type: 1, pricePerHour: 1, subFields: 1 } }
    )

    if (!field) {
      return res.status(404).json({ message: "Sân không tồn tại." })
    }

    const selectedSubField = findFieldSubField(field, subFieldKey)
    if (!selectedSubField) {
      return res.status(400).json({ message: "Sân con không hợp lệ." })
    }

    const bookingsCollection = await getBookingsCollection()
    const existingBookings = await bookingsCollection
      .find(
        {
          fieldId,
          date,
          status: { $in: BLOCKING_BOOKING_STATUSES },
        },
        {
          projection: {
            _id: 0,
            timeSlot: 1,
            subFieldKey: 1,
          },
        }
      )
      .toArray()

    const hasConflict = existingBookings.some(
      (booking) =>
        doesBookingBlockSubField(booking, selectedSubField.key)
        && doesTimeSlotOverlap(timeSlot, booking.timeSlot)
    )

    if (hasConflict) {
      return res.status(409).json({ message: "Khung giờ này đã được đặt." })
    }

    const selectedPricePerHour = normalizeMoney(selectedSubField.pricePerHour || field.pricePerHour)
    const totalPrice = calculateBookingTotalPrice(selectedPricePerHour, timeSlot)
    const depositAmount = calculateBookingDepositAmount(totalPrice)

    const booking = {
      userId: req.auth.sub,
      fieldId,
      fieldName: field.name,
      subFieldKey: selectedSubField.key,
      subFieldName: selectedSubField.name,
      subFieldType: selectedSubField.type || field.type || "",
      date,
      timeSlot,
      pricePerHour: selectedPricePerHour,
      totalPrice,
      depositAmount,
      remainingAmount: calculateBookingRemainingAmount(totalPrice, depositAmount),
      depositPaid: false,
      depositStatus: "unpaid",
      depositMethod: null,
      depositReference: null,
      depositPaidAt: null,
      phone,
      address: null,
      note: note || "",
      status: "pending",
      createdAt: new Date(),
    }
    const result = await bookingsCollection.insertOne(booking)

    return res.status(201).json({
      message: "Tạo đơn đặt sân thành công.",
      booking: sanitizeMongoBooking({
        ...booking,
        _id: result.insertedId,
      }),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tạo đơn đặt sân."),
    })
  }
})

app.get("/api/bookings/availability", async (req, res) => {
  const date = String(req.query.date || "").trim()
  const rawFieldId = String(req.query.fieldId || "").trim()
  const fieldId = rawFieldId ? parseFieldId(rawFieldId) : null

  if (!parseBookingDate(date)) {
    return res.status(400).json({ message: "Ngày đặt sân không hợp lệ." })
  }

  if (rawFieldId && fieldId === null) {
    return res.status(400).json({ message: "ID sân không hợp lệ." })
  }

  try {
    const bookingsCollection = await getBookingsCollection()
    const query = {
      date,
      status: { $in: BLOCKING_BOOKING_STATUSES },
    }

    if (fieldId !== null) {
      query.fieldId = fieldId
    }

    const rows = await bookingsCollection
      .find(query, {
        projection: {
          fieldId: 1,
          subFieldKey: 1,
          subFieldName: 1,
          date: 1,
          timeSlot: 1,
          status: 1,
        },
      })
      .toArray()

    return res.json({
      bookings: rows.map((booking) => sanitizeBookingAvailability(booking)),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải lịch đặt sân."),
    })
  }
})

app.get("/api/bookings/me", authMiddleware, async (req, res) => {
  try {
    const bookingsCollection = await getBookingsCollection()
    const rows = await bookingsCollection
      .find({ userId: req.auth.sub })
      .sort({ createdAt: -1 })
      .toArray()

    return res.json({
      bookings: rows.map((booking) => sanitizeMongoBooking(booking)),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải danh sách đặt sân."),
    })
  }
})

app.post("/api/bookings/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const { booking, field } = await getBookingAndFieldById(req.params.id, req.auth.sub)

    if (!booking) {
      return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n Ä‘áº·t cáº§n há»§y." })
    }

    const currentStatus = String(booking.status || "").trim().toLowerCase()
    const updatedBooking =
      currentStatus === "cancelled"
        ? booking
        : await setBookingStatusState(req.params.id, {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledByUserId: String(req.auth.sub || ""),
          })

    return res.json({
      message:
        currentStatus === "cancelled"
          ? "ÄÆ¡n Ä‘áº·t Ä‘Ã£ Ä‘Æ°á»£c há»§y tá»« trÆ°á»›c."
          : "ÄÃ£ há»§y Ä‘Æ¡n Ä‘áº·t cá»§a báº¡n.",
      booking: sanitizeMongoBooking(updatedBooking, field),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "KhÃ´ng thá»ƒ há»§y Ä‘Æ¡n Ä‘áº·t lÃºc nÃ y."),
    })
  }
})

app.get("/api/bookings/:id/deposit", authMiddleware, async (req, res) => {
  try {
    const { booking, field } = await getBookingAndFieldById(req.params.id, req.auth.sub)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt cần thanh toán đặt cọc." })
    }

    return res.json({
      booking: sanitizeMongoBooking(booking, field),
      field: field ? sanitizeMongoField(field) : null,
      paymentMethods: buildPaymentMethods(booking, field),
      staticTransfer: buildStaticTransferInfo(booking, field),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tải thông tin đặt cọc."),
    })
  }
})

app.post("/api/bookings/:id/deposit/static-confirm", authMiddleware, async (req, res) => {
  try {
    const { booking, field } = await getBookingAndFieldById(req.params.id, req.auth.sub)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt cần đặt cọc." })
    }

    if (!isStaticTransferConfigured()) {
      return res.status(503).json({
        message: "Thông tin chuyển khoản/QR tĩnh chưa được cấu hình.",
      })
    }

    const paymentState = getBookingPaymentState(booking, field)
    const updatedBooking = await setBookingDepositState(req.params.id, {
      pricePerHour: paymentState.pricePerHour,
      totalPrice: paymentState.totalPrice,
      depositAmount: paymentState.depositAmount,
      remainingAmount: paymentState.remainingAmount,
      depositPaid: true,
      depositStatus: "paid",
      depositMethod: "static_transfer",
      depositReference: buildStaticTransferNote(req.params.id),
    })

    return res.json({
      message: "Đã ghi nhận đặt cọc chuyển khoản thành công.",
      booking: sanitizeMongoBooking(updatedBooking, field),
      field: field ? sanitizeMongoField(field) : null,
      paymentMethods: buildPaymentMethods(updatedBooking, field),
      staticTransfer: buildStaticTransferInfo(updatedBooking, field),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể ghi nhận đặt cọc chuyển khoản."),
    })
  }
})

app.post("/api/bookings/:id/deposit/vnpay/create", authMiddleware, async (req, res) => {
  try {
    if (!isVnpayConfigured()) {
      return res.status(503).json({ message: "VNPAY chưa được cấu hình." })
    }

    const { booking, field } = await getBookingAndFieldById(req.params.id, req.auth.sub)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt cần thanh toán." })
    }

    const paymentState = getBookingPaymentState(booking, field)
    if (paymentState.depositPaid) {
      return res.status(409).json({ message: "Đơn đặt này đã được đặt cọc." })
    }

    if (!paymentState.depositAmount) {
      return res.status(400).json({ message: "Không tính được số tiền đặt cọc cho đơn này." })
    }

    const bookingId = String(booking._id)
    const orderReference = createPaymentOrderReference("VNPAY", bookingId)
    const createdAt = new Date()
    const expiredAt = new Date(createdAt.getTime() + 15 * 60 * 1000)
    const vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: VNPAY_TMN_CODE,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderReference,
      vnp_OrderInfo: `Đặt cọc ${booking.fieldName} ${booking.date}`,
      vnp_OrderType: "other",
      vnp_Amount: String(paymentState.depositAmount * 100),
      vnp_ReturnUrl: `${SERVER_PUBLIC_URL}/api/payments/vnpay/return`,
      vnp_IpAddr: getRequestIpAddress(req),
      vnp_CreateDate: formatVnpayDate(createdAt),
      vnp_ExpireDate: formatVnpayDate(expiredAt),
    }

    const paymentUrl =
      `${VNPAY_PAYMENT_URL}?${buildVnpayQueryString({
        ...vnpParams,
        vnp_SecureHash: signVnpayParams(vnpParams),
      })}`

    const updatedBooking = await setBookingDepositState(req.params.id, {
      pricePerHour: paymentState.pricePerHour,
      totalPrice: paymentState.totalPrice,
      depositAmount: paymentState.depositAmount,
      remainingAmount: paymentState.remainingAmount,
      depositPaid: false,
      depositStatus: "pending",
      depositMethod: "vnpay",
      depositReference: orderReference,
    })

    return res.json({
      paymentUrl,
      booking: sanitizeMongoBooking(updatedBooking, field),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tạo liên kết thanh toán VNPAY."),
    })
  }
})

app.get("/api/payments/vnpay/return", async (req, res) => {
  const transactionReference = String(req.query.vnp_TxnRef || "")
  const bookingId = extractBookingIdFromPaymentReference(transactionReference)

  if (!bookingId) {
    return res.redirect(
      302,
      buildClientBookingsUrl({
        provider: "vnpay",
        paymentStatus: "error",
        paymentMessage: "Không xác định được đơn đặt từ VNPAY.",
      })
    )
  }

  if (!verifyVnpayCallback(req.query)) {
    return res.redirect(
      302,
      buildClientDepositUrl(bookingId, {
        provider: "vnpay",
        paymentStatus: "error",
        paymentMessage: "Chữ ký VNPAY không hợp lệ.",
      })
    )
  }

  try {
    const { booking, field } = await getBookingAndFieldById(bookingId)

    if (!booking) {
      return res.redirect(
        302,
        buildClientBookingsUrl({
          provider: "vnpay",
          paymentStatus: "error",
          paymentMessage: "Không tìm thấy đơn đặt cần cập nhật đặt cọc.",
        })
      )
    }

    const paymentState = getBookingPaymentState(booking, field)
    const callbackAmount = Math.round(Number(req.query.vnp_Amount || 0))
    const isPaymentSuccess =
      String(req.query.vnp_ResponseCode || "") === "00"
      && String(req.query.vnp_TransactionStatus || "00") === "00"

    if (isPaymentSuccess && paymentState.depositAmount * 100 !== callbackAmount) {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: false,
        depositStatus: "failed",
        depositMethod: "vnpay",
        depositReference: transactionReference,
      })

      return res.redirect(
        302,
        buildClientDepositUrl(bookingId, {
          provider: "vnpay",
          paymentStatus: "error",
          paymentMessage: "Số tiền VNPAY trả về không khớp.",
        })
      )
    }

    if (isPaymentSuccess) {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: true,
        depositStatus: "paid",
        depositMethod: "vnpay",
        depositReference: String(req.query.vnp_TransactionNo || transactionReference),
      })

      return res.redirect(
        302,
        buildClientDepositUrl(bookingId, {
          provider: "vnpay",
          paymentStatus: "success",
          paymentMessage: "Thanh toán đặt cọc qua VNPAY thành công.",
        })
      )
    }

    await setBookingDepositState(bookingId, {
      pricePerHour: paymentState.pricePerHour,
      totalPrice: paymentState.totalPrice,
      depositAmount: paymentState.depositAmount,
      remainingAmount: paymentState.remainingAmount,
      depositPaid: false,
      depositStatus: "failed",
      depositMethod: "vnpay",
      depositReference: transactionReference,
    })

    return res.redirect(
      302,
      buildClientDepositUrl(bookingId, {
        provider: "vnpay",
        paymentStatus: "error",
        paymentMessage: "VNPAY chưa xác nhận giao dịch thành công.",
      })
    )
  } catch (_error) {
    return res.redirect(
      302,
      buildClientDepositUrl(bookingId, {
        provider: "vnpay",
        paymentStatus: "error",
        paymentMessage: "Không thể cập nhật trạng thái đặt cọc từ VNPAY.",
      })
    )
  }
})

app.get("/api/payments/vnpay/ipn", async (req, res) => {
  const transactionReference = String(req.query.vnp_TxnRef || "")
  const bookingId = extractBookingIdFromPaymentReference(transactionReference)

  if (!verifyVnpayCallback(req.query)) {
    return res.json({ RspCode: "97", Message: "Chữ ký không hợp lệ" })
  }

  if (!bookingId) {
    return res.json({ RspCode: "01", Message: "Không tìm thấy đơn hàng" })
  }

  try {
    const { booking, field } = await getBookingAndFieldById(bookingId)

    if (!booking) {
      return res.json({ RspCode: "01", Message: "Không tìm thấy đơn hàng" })
    }

    const paymentState = getBookingPaymentState(booking, field)
    const callbackAmount = Math.round(Number(req.query.vnp_Amount || 0))

    if (paymentState.depositAmount * 100 !== callbackAmount) {
      return res.json({ RspCode: "04", Message: "Số tiền không hợp lệ" })
    }

    const isPaymentSuccess =
      String(req.query.vnp_ResponseCode || "") === "00"
      && String(req.query.vnp_TransactionStatus || "00") === "00"

    if (isPaymentSuccess) {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: true,
        depositStatus: "paid",
        depositMethod: "vnpay",
        depositReference: String(req.query.vnp_TransactionNo || transactionReference),
      })
    } else {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: false,
        depositStatus: "failed",
        depositMethod: "vnpay",
        depositReference: transactionReference,
      })
    }

    return res.json({ RspCode: "00", Message: "Xác nhận thành công" })
  } catch (error) {
    return res.json({
      RspCode: "99",
      Message: mapMongoErrorMessage(error, "Lỗi không xác định"),
    })
  }
})

app.post("/api/bookings/:id/deposit/momo/create", authMiddleware, async (req, res) => {
  try {
    if (!isMomoConfigured()) {
      return res.status(503).json({ message: "MoMo chưa được cấu hình." })
    }

    const { booking, field } = await getBookingAndFieldById(req.params.id, req.auth.sub)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt cần thanh toán." })
    }

    const paymentState = getBookingPaymentState(booking, field)
    if (paymentState.depositPaid) {
      return res.status(409).json({ message: "Đơn đặt này đã được đặt cọc." })
    }

    if (!paymentState.depositAmount) {
      return res.status(400).json({ message: "Không tính được số tiền đặt cọc cho đơn này." })
    }

    const bookingId = String(booking._id)
    const orderId = createPaymentOrderReference("MOMO", bookingId)
    const requestId = `${orderId}_REQ`
    const momoRequest = {
      partnerCode: MOMO_PARTNER_CODE,
      partnerName: MOMO_PARTNER_NAME,
      storeId: MOMO_STORE_ID,
      requestId,
      amount: String(paymentState.depositAmount),
      orderId,
      orderInfo: `Đặt cọc ${booking.fieldName} ${booking.date}`,
      redirectUrl: `${SERVER_PUBLIC_URL}/api/payments/momo/return`,
      ipnUrl: `${SERVER_PUBLIC_URL}/api/payments/momo/ipn`,
      lang: "vi",
      requestType: "captureWallet",
      autoCapture: true,
      extraData: "",
    }

    const requestBody = {
      ...momoRequest,
      signature: signMomoText(buildMomoCreateSignaturePayload(momoRequest)),
    }

    const momoResponse = await fetch(MOMO_CREATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const rawResponseText = await momoResponse.text()
    let responseData = null

    try {
      responseData = rawResponseText ? JSON.parse(rawResponseText) : null
    } catch (_error) {
      responseData = null
    }

    const momoErrorMessage = String(
      responseData?.message || rawResponseText || "Không thể tạo liên kết thanh toán MoMo."
    ).trim()

    if (!momoResponse.ok || !responseData?.payUrl || Number(responseData?.resultCode) !== 0) {
      return res.status(502).json({ message: momoErrorMessage })
    }

    if (
      responseData.signature
      && !verifyMomoSignature(responseData, buildMomoCreateResponseSignaturePayload)
    ) {
      return res.status(502).json({
        message: "Chữ ký phản hồi từ MoMo không hợp lệ.",
      })
    }

    const updatedBooking = await setBookingDepositState(req.params.id, {
      pricePerHour: paymentState.pricePerHour,
      totalPrice: paymentState.totalPrice,
      depositAmount: paymentState.depositAmount,
      remainingAmount: paymentState.remainingAmount,
      depositPaid: false,
      depositStatus: "pending",
      depositMethod: "momo",
      depositReference: orderId,
    })

    return res.json({
      paymentUrl: responseData.payUrl,
      booking: sanitizeMongoBooking(updatedBooking, field),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể tạo liên kết thanh toán MoMo."),
    })
  }
})

app.get("/api/payments/momo/return", async (req, res) => {
  const orderId = String(req.query.orderId || "")
  const bookingId = extractBookingIdFromPaymentReference(orderId)

  if (!bookingId) {
    return res.redirect(
      302,
      buildClientBookingsUrl({
        provider: "momo",
        paymentStatus: "error",
        paymentMessage: "Không xác định được đơn đặt từ MoMo.",
      })
    )
  }

  if (!verifyMomoSignature(req.query, buildMomoCallbackSignaturePayload)) {
    return res.redirect(
      302,
      buildClientDepositUrl(bookingId, {
        provider: "momo",
        paymentStatus: "error",
        paymentMessage: "Chữ ký MoMo không hợp lệ.",
      })
    )
  }

  try {
    const { booking, field } = await getBookingAndFieldById(bookingId)

    if (!booking) {
      return res.redirect(
        302,
        buildClientBookingsUrl({
          provider: "momo",
          paymentStatus: "error",
          paymentMessage: "Không tìm thấy đơn đặt cần cập nhật đặt cọc.",
        })
      )
    }

    const paymentState = getBookingPaymentState(booking, field)
    const callbackAmount = normalizeMoney(req.query.amount)
    const isPaymentSuccess = String(req.query.resultCode || "") === "0"

    if (isPaymentSuccess && paymentState.depositAmount !== callbackAmount) {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: false,
        depositStatus: "failed",
        depositMethod: "momo",
        depositReference: orderId,
      })

      return res.redirect(
        302,
        buildClientDepositUrl(bookingId, {
          provider: "momo",
          paymentStatus: "error",
          paymentMessage: "Số tiền MoMo trả về không khớp.",
        })
      )
    }

    if (isPaymentSuccess) {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: true,
        depositStatus: "paid",
        depositMethod: "momo",
        depositReference: String(req.query.transId || orderId),
      })

      return res.redirect(
        302,
        buildClientDepositUrl(bookingId, {
          provider: "momo",
          paymentStatus: "success",
          paymentMessage: "Thanh toán đặt cọc qua MoMo thành công.",
        })
      )
    }

    await setBookingDepositState(bookingId, {
      pricePerHour: paymentState.pricePerHour,
      totalPrice: paymentState.totalPrice,
      depositAmount: paymentState.depositAmount,
      remainingAmount: paymentState.remainingAmount,
      depositPaid: false,
      depositStatus: "failed",
      depositMethod: "momo",
      depositReference: orderId,
    })

    return res.redirect(
      302,
      buildClientDepositUrl(bookingId, {
        provider: "momo",
        paymentStatus: "error",
        paymentMessage: "MoMo chưa xác nhận giao dịch thành công.",
      })
    )
  } catch (_error) {
    return res.redirect(
      302,
      buildClientDepositUrl(bookingId, {
        provider: "momo",
        paymentStatus: "error",
        paymentMessage: "Không thể cập nhật trạng thái đặt cọc từ MoMo.",
      })
    )
  }
})

app.post("/api/payments/momo/ipn", async (req, res) => {
  if (!verifyMomoSignature(req.body, buildMomoCallbackSignaturePayload)) {
    return res.status(400).json({ message: "Chữ ký không hợp lệ." })
  }

  const orderId = String(req.body.orderId || "")
  const bookingId = extractBookingIdFromPaymentReference(orderId)

  if (!bookingId) {
    return res.status(404).json({ message: "Không tìm thấy đơn hàng." })
  }

  try {
    const { booking, field } = await getBookingAndFieldById(bookingId)

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." })
    }

    const paymentState = getBookingPaymentState(booking, field)
    const callbackAmount = normalizeMoney(req.body.amount)
    const isPaymentSuccess = String(req.body.resultCode || "") === "0"

    if (callbackAmount !== paymentState.depositAmount) {
      return res.status(400).json({ message: "Số tiền không hợp lệ." })
    }

    if (isPaymentSuccess) {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: true,
        depositStatus: "paid",
        depositMethod: "momo",
        depositReference: String(req.body.transId || orderId),
      })
    } else {
      await setBookingDepositState(bookingId, {
        pricePerHour: paymentState.pricePerHour,
        totalPrice: paymentState.totalPrice,
        depositAmount: paymentState.depositAmount,
        remainingAmount: paymentState.remainingAmount,
        depositPaid: false,
        depositStatus: "failed",
        depositMethod: "momo",
        depositReference: orderId,
      })
    }

    return res.json({ message: "Đã nhận callback." })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể xử lý callback MoMo."),
    })
  }
})

app.post("/api/contact", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {}
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const phone = String(body.phone || "").trim()
  const message = String(body.message || "").trim()

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin liên hệ." })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Email không hợp lệ." })
  }

  try {
    const contactsCollection = await getContactsCollection()
    const contact = {
      id: await getNextSequenceValue("contacts"),
      name,
      email,
      phone: phone || null,
      message,
      createdAt: new Date(),
    }

    await contactsCollection.insertOne(contact)

    return res.status(201).json({
      message: "Gửi liên hệ thành công.",
      contact: sanitizeMongoContact(contact),
    })
  } catch (error) {
    return res.status(500).json({
      message: mapMongoErrorMessage(error, "Không thể gửi liên hệ lúc này."),
    })
  }
})

app.use((error, _req, res, next) => {
  if (!error) {
    return next()
  }

  if (res.headersSent) {
    return next(error)
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Dữ liệu JSON không hợp lệ." })
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Tệp tải lên vượt quá giới hạn 8MB." })
  }

  const status = Number(error.status || error.statusCode || 500)
  const message = String(error.message || "").trim() || "Yêu cầu thất bại."

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(error)
  }

  return res.status(status).json({ message })
})

module.exports = {
  app,
}
