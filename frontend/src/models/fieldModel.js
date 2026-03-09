import { getUniqueFieldTypes, normalizeFieldType } from "./fieldTypeModel"

export const formatPrice = (value) => {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0))
}

const buildFallbackSlug = (value, fallback = "san-moi") => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || fallback
}

const normalizeSubFields = (value, field = null) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((subField, index) => {
      if (typeof subField === "string") {
        const name = subField.trim()
        return name
          ? {
              key: buildFallbackSlug(name, `san-${index + 1}`),
              name,
              type: normalizeFieldType(field?.type, String(field?.type || "").trim()),
              pricePerHour: Number(field?.pricePerHour || 0),
              openHours: String(field?.openHours || "").trim(),
            }
          : null
      }

      if (subField && typeof subField === "object") {
        const name = String(subField.name || `Sân ${index + 1}`).trim()
        const key = buildFallbackSlug(subField.key || name, `san-${index + 1}`)
        return name
          ? {
              key,
              name,
              type: normalizeFieldType(
                subField.type,
                normalizeFieldType(field?.type, String(field?.type || "").trim())
              ),
              pricePerHour: Number(subField.pricePerHour || field?.pricePerHour || 0),
              openHours: String(subField.openHours || field?.openHours || "").trim(),
            }
          : null
      }

      return null
    })
    .filter(Boolean)
}

const normalizeField = (field) => {
  const id = Number(field?.id)
  const name = String(field?.name || "").trim()

  if (!Number.isInteger(id) || id < 1 || !name) {
    return null
  }

  const coverImage = String(field?.coverImage || "").trim()

  return {
    id,
    name,
    slug: String(field?.slug || "").trim() || buildFallbackSlug(name, `san-${id}`),
    address: String(field?.address || "").trim(),
    district: String(field?.district || "").trim(),
    type: normalizeFieldType(field?.type, String(field?.type || "").trim()),
    openHours: String(field?.openHours || "").trim(),
    pricePerHour: Number(field?.pricePerHour || 0),
    rating: Number(field?.rating || 0),
    coverImage,
    article: String(field?.article || "").trim(),
    images: Array.isArray(field?.images) ? field.images.filter(Boolean) : coverImage ? [coverImage] : [],
    subFields: normalizeSubFields(field?.subFields, field),
    ownerUserId: field?.ownerUserId || null,
    ownerFullName: field?.ownerFullName || "",
    managedByAdmin: Boolean(field?.managedByAdmin || field?.ownerUserId),
  }
}

export const getFieldList = (data) => {
  const source = Array.isArray(data?.fields) ? data.fields : []
  return source.map((field) => normalizeField(field)).filter(Boolean)
}

export const getFieldDetail = (data) => {
  return normalizeField(data?.field || data)
}

export const getFieldTypeSummary = (field) => {
  if (!field) {
    return ""
  }

  const subFieldTypes = Array.isArray(field.subFields) ? field.subFields.map((subField) => subField?.type) : []
  const uniqueTypes = getUniqueFieldTypes(subFieldTypes.length > 0 ? subFieldTypes : [field.type])

  return uniqueTypes.join(", ")
}
