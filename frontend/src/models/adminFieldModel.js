import { getFieldDetail, getFieldList } from "./fieldModel"
import { DEFAULT_FIELD_TYPE, normalizeFieldType } from "./fieldTypeModel"

let adminSubFieldDraftId = 0

const nextAdminSubFieldDraftId = () => {
  adminSubFieldDraftId += 1
  return `admin-subfield-${adminSubFieldDraftId}`
}

const isValidFieldPrice = (value) => {
  const price = Math.round(Number(value || 0))
  return Number.isFinite(price) && price >= 1000 && price % 1000 === 0
}

const normalizeOptionalCoordinate = (value) => {
  const normalized = String(value ?? "").trim()
  if (!normalized) {
    return null
  }

  const coordinate = Number(normalized)
  return Number.isFinite(coordinate) ? Number(coordinate.toFixed(6)) : null
}

export const createAdminSubFieldDraft = (index = 1, defaults = {}) => ({
  id: nextAdminSubFieldDraftId(),
  key: String(defaults.key || "").trim(),
  name: String(defaults.name || `Sân ${index}`).trim(),
  type: normalizeFieldType(defaults.type, DEFAULT_FIELD_TYPE),
  pricePerHour: String(defaults.pricePerHour || "").trim(),
})

export const createAdminFieldForm = () => ({
  name: "",
  address: "",
  district: "",
  latitude: "",
  longitude: "",
  type: DEFAULT_FIELD_TYPE,
  openHours: "06:00 - 22:00",
  pricePerHour: "",
  rating: "5",
  coverImage: "",
  article: "",
  subFields: [createAdminSubFieldDraft(1), createAdminSubFieldDraft(2)],
  galleryImages: [],
})

export const createAdminFieldFormErrors = (form = {}) => ({
  name: "",
  address: "",
  district: "",
  type: "",
  openHours: "",
  pricePerHour: "",
  subFieldsMessage: "",
  subFields: (Array.isArray(form?.subFields) ? form.subFields : []).map(() => ({
    name: "",
    type: "",
    pricePerHour: "",
  })),
})

export const createAdminFieldFormFromField = (field) => ({
  name: String(field?.name || "").trim(),
  address: String(field?.address || "").trim(),
  district: String(field?.district || "").trim(),
  latitude:
    Number.isFinite(Number(field?.latitude)) && field?.latitude !== null
      ? String(field.latitude)
      : "",
  longitude:
    Number.isFinite(Number(field?.longitude)) && field?.longitude !== null
      ? String(field.longitude)
      : "",
  type: normalizeFieldType(field?.type, DEFAULT_FIELD_TYPE),
  openHours: String(field?.openHours || "06:00 - 22:00").trim(),
  pricePerHour: String(field?.pricePerHour || "").trim(),
  rating: String(field?.rating || "5").trim(),
  coverImage: String(field?.coverImage || "").trim(),
  article: String(field?.article || "").trim(),
  subFields:
    Array.isArray(field?.subFields) && field.subFields.length > 0
      ? field.subFields.map((subField, index) =>
          createAdminSubFieldDraft(index + 1, {
            key: subField?.key,
            name: subField?.name,
            type: subField?.type,
            pricePerHour: subField?.pricePerHour,
          })
        )
      : [createAdminSubFieldDraft(1), createAdminSubFieldDraft(2)],
  galleryImages: Array.isArray(field?.images) ? field.images.filter(Boolean) : [],
})

const getFirstAdminFieldErrorMessage = (fieldErrors) => {
  const directKeys = ["name", "address", "district", "type", "openHours", "pricePerHour"]
  for (const key of directKeys) {
    if (fieldErrors[key]) {
      return fieldErrors[key]
    }
  }

  if (fieldErrors.subFieldsMessage) {
    return fieldErrors.subFieldsMessage
  }

  const subFieldErrors = Array.isArray(fieldErrors.subFields) ? fieldErrors.subFields : []
  for (const item of subFieldErrors) {
    if (!item || typeof item !== "object") {
      continue
    }

    if (item.name) {
      return item.name
    }

    if (item.type) {
      return item.type
    }

    if (item.pricePerHour) {
      return item.pricePerHour
    }
  }

  return ""
}

export const validateAdminFieldForm = (form) => {
  const fieldErrors = createAdminFieldFormErrors(form)
  const normalizedType = normalizeFieldType(form.type)
  const normalizedName = String(form.name || "").trim()
  const normalizedAddress = String(form.address || "").trim()
  const normalizedDistrict = String(form.district || "").trim()
  const normalizedOpenHours = String(form.openHours || "").trim()
  const normalizedPricePerHour = String(form.pricePerHour || "").trim()

  if (!normalizedName) {
    fieldErrors.name = "Vui lòng nhập tên sân."
  }

  if (!normalizedAddress) {
    fieldErrors.address = "Vui lòng nhập địa chỉ sân."
  }

  if (!normalizedDistrict) {
    fieldErrors.district = "Vui lòng nhập khu vực."
  }

  if (!normalizedType) {
    fieldErrors.type = "Vui lòng chọn loại sân mặc định."
  }

  if (!normalizedOpenHours) {
    fieldErrors.openHours = "Vui lòng nhập giờ mở cửa."
  } else if (
    !/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedOpenHours)
  ) {
    fieldErrors.openHours = "Giờ mở cửa phải theo định dạng HH:mm - HH:mm."
  }

  if (!normalizedPricePerHour) {
    fieldErrors.pricePerHour = "Vui lòng nhập giá mặc định theo giờ."
  } else if (!isValidFieldPrice(normalizedPricePerHour)) {
    fieldErrors.pricePerHour =
      "Giá mặc định theo giờ phải từ 1.000 VND trở lên và là bội số của 1.000."
  }

  const subFields = Array.isArray(form.subFields) ? form.subFields : []
  if (subFields.length === 0) {
    fieldErrors.subFieldsMessage = "Vui lòng tạo ít nhất 1 sân con."
  }

  fieldErrors.subFields = subFields.map((subField) => {
    const subFieldErrors = {
      name: "",
      type: "",
      pricePerHour: "",
    }
    const name = String(subField?.name || "").trim()
    const type = normalizeFieldType(subField?.type, normalizedType)
    const rawPricePerHour = String(subField?.pricePerHour || "").trim()
    const effectivePricePerHour = rawPricePerHour || normalizedPricePerHour

    if (!name) {
      subFieldErrors.name = "Vui lòng nhập tên sân con."
    }

    if (!type) {
      subFieldErrors.type = "Vui lòng chọn loại sân."
    }

    if (!effectivePricePerHour) {
      subFieldErrors.pricePerHour = "Vui lòng nhập giá theo giờ cho sân con."
    } else if (!isValidFieldPrice(effectivePricePerHour)) {
      subFieldErrors.pricePerHour = "Giá sân con phải là bội số hợp lệ của 1.000."
    }

    return subFieldErrors
  })

  const message = getFirstAdminFieldErrorMessage(fieldErrors)

  return {
    isValid: !message,
    message,
    fieldErrors,
  }
}

export const buildAdminFieldPayload = (form) => ({
  name: String(form.name || "").trim(),
  address: String(form.address || "").trim(),
  district: String(form.district || "").trim(),
  latitude: normalizeOptionalCoordinate(form.latitude),
  longitude: normalizeOptionalCoordinate(form.longitude),
  type: normalizeFieldType(form.type, DEFAULT_FIELD_TYPE),
  openHours: String(form.openHours || "").trim(),
  pricePerHour: Math.round(Number(form.pricePerHour || 0)),
  rating: Math.max(Number(form.rating || 5), 0),
  coverImage: String(form.coverImage || "").trim(),
  article: String(form.article || "").trim(),
  subFields: (Array.isArray(form.subFields) ? form.subFields : [])
    .map((subField) => ({
      key: String(subField?.key || "").trim(),
      name: String(subField?.name || "").trim(),
      type: normalizeFieldType(subField?.type, normalizeFieldType(form.type, DEFAULT_FIELD_TYPE)),
      pricePerHour: Math.round(Number(subField?.pricePerHour || form.pricePerHour || 0)),
    }))
    .filter((subField) => subField.name),
  images: (Array.isArray(form.galleryImages) ? form.galleryImages : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean),
})

export const getAdminFieldList = (data) => getFieldList(data)
export const getAdminFieldItem = (data) => getFieldDetail(data)
