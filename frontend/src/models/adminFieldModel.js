import { getFieldDetail, getFieldList } from "./fieldModel"
import { DEFAULT_FIELD_TYPE, normalizeFieldType } from "./fieldTypeModel"

let adminSubFieldDraftId = 0

const nextAdminSubFieldDraftId = () => {
  adminSubFieldDraftId += 1
  return `admin-subfield-${adminSubFieldDraftId}`
}

export const createAdminSubFieldDraft = (index = 1, defaults = {}) => ({
  id: nextAdminSubFieldDraftId(),
  key: String(defaults.key || "").trim(),
  name: String(defaults.name || `San ${index}`).trim(),
  type: normalizeFieldType(defaults.type, DEFAULT_FIELD_TYPE),
  pricePerHour: String(defaults.pricePerHour || "").trim(),
})

export const createAdminFieldForm = () => ({
  name: "",
  address: "",
  district: "",
  type: DEFAULT_FIELD_TYPE,
  openHours: "06:00 - 22:00",
  pricePerHour: "",
  rating: "5",
  coverImage: "",
  article: "",
  subFields: [createAdminSubFieldDraft(1), createAdminSubFieldDraft(2)],
  galleryImages: [],
})

export const createAdminFieldFormFromField = (field) => ({
  name: String(field?.name || "").trim(),
  address: String(field?.address || "").trim(),
  district: String(field?.district || "").trim(),
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

export const validateAdminFieldForm = (form) => {
  const normalizedType = normalizeFieldType(form.type)
  const requiredValues = [form.name, form.address, form.district, normalizedType, form.openHours, form.pricePerHour].map(
    (value) => String(value || "").trim()
  )

  if (requiredValues.some((value) => !value)) {
    return "Vui lòng nhập đầy đủ thông tin sân."
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/.test(String(form.openHours || "").trim())) {
    return "Giờ mở cửa phải theo định dạng HH:mm - HH:mm."
  }

  if (Number(form.pricePerHour || 0) <= 0) {
    return "Giá mặc định phải lớn hơn 0."
  }

  const subFields = Array.isArray(form.subFields) ? form.subFields : []
  if (subFields.length === 0) {
    return "Vui lòng tạo ít nhất 1 sân con."
  }

  const hasInvalidSubField = subFields.some((subField) => {
    const name = String(subField?.name || "").trim()
    const type = normalizeFieldType(subField?.type, normalizedType)
    const pricePerHour = Number(subField?.pricePerHour || form.pricePerHour || 0)

    return !name || !type || pricePerHour <= 0
  })

  if (hasInvalidSubField) {
    return "Mỗi sân con cần có tên, loại sân và giá theo giờ hợp lệ."
  }

  return ""
}

export const buildAdminFieldPayload = (form) => ({
  name: String(form.name || "").trim(),
  address: String(form.address || "").trim(),
  district: String(form.district || "").trim(),
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
