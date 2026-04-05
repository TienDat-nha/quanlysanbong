import { getFieldTypeLabel, getUniqueFieldTypes, normalizeFieldType } from "./fieldTypeModel"

export const formatPrice = (value) => new Intl.NumberFormat("vi-VN").format(Number(value || 0))

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const buildFallbackSlug = (value, fallback = "san-moi") =>
  normalizeSearchText(value).replace(/\s+/g, "-") || fallback

const splitLocationSegments = (...values) =>
  values
    .flatMap((value) => String(value || "").split(","))
    .map((part) => part.trim())
    .filter(Boolean)

const extractLocationParts = (address, district, city, ward) => {
  const segments = splitLocationSegments(address, district, city, ward)

  return {
    ward: String(ward || segments.find((segment) => /^(phuong|p|xa|x|thi tran|tt)\b/i.test(segment)) || "").trim(),
    city: String(city || segments[segments.length - 1] || "").trim(),
  }
}

const pickEntityId = (...values) => {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedId = pickEntityId(value._id, value.id, value.userId, value.fieldId)
      if (nestedId) {
        return nestedId
      }
      continue
    }

    const normalized = String(value || "").trim()
    if (normalized && normalized !== "[object Object]") {
      return normalized
    }
  }

  return ""
}

const buildFieldSearchIndex = (field) => ({
  keyword: normalizeSearchText(
    [
      field.name,
      field.address,
      field.district,
      field.ward,
      field.city,
      field.type,
      ...(Array.isArray(field.subFields) ? field.subFields.map((subField) => subField?.name) : []),
    ].join(" ")
  ),
  ward: normalizeSearchText([field.ward, field.address, field.district].join(" ")),
  city: normalizeSearchText([field.city, field.address, field.district].join(" ")),
})

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
              id: buildFallbackSlug(name, `san-${index + 1}`),
              key: buildFallbackSlug(name, `san-${index + 1}`),
              name,
              type: normalizeFieldType(field?.type, String(field?.type || "").trim()),
              typeLabel: getFieldTypeLabel(field?.type),
              pricePerHour: Number(field?.pricePerHour || 0),
              openHours: String(field?.openHours || "").trim(),
            }
          : null
      }

      if (subField && typeof subField === "object") {
        const id = String(subField.id || subField._id || subField.subFieldId || "").trim()
        const name = String(subField.name || `Sân ${index + 1}`).trim()
        const key = buildFallbackSlug(subField.key || id || name, `san-${index + 1}`)
        return name
          ? {
              ...subField,
              id: id || key,
              key,
              name,
              type: normalizeFieldType(
                subField.type,
                normalizeFieldType(field?.type, String(field?.type || "").trim())
              ),
              typeLabel: getFieldTypeLabel(
                subField.type,
                getFieldTypeLabel(field?.type, String(field?.type || "").trim())
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
  const id = String(field?.id || field?._id || field?.fieldId || "").trim()
  const name = String(field?.name || field?.fieldName || "").trim()

  if (!id && !name) {
    return null
  }

  const coverImage = String(field?.coverImage || field?.image || field?.thumbnail || "").trim()
  const address = String(field?.address || field?.location || "").trim()
  const district = String(field?.district || field?.area || "").trim()
  const locationParts = extractLocationParts(address, district, field?.city, field?.ward)
  const subFields = normalizeSubFields(field?.subFields || field?.subfields, field)

  const normalizedField = {
    ...field,
    id: id || name,
    name: name || id,
    slug: String(field?.slug || "").trim() || buildFallbackSlug(name, id || "san-moi"),
    address,
    district,
    ward: locationParts.ward,
    city: locationParts.city,
    latitude: Number.isFinite(Number(field?.latitude)) ? Number(field.latitude) : null,
    longitude: Number.isFinite(Number(field?.longitude)) ? Number(field.longitude) : null,
    type: normalizeFieldType(field?.type, String(field?.type || "").trim()),
    typeLabel: getFieldTypeLabel(field?.type, String(field?.type || "").trim()),
    openHours: String(field?.openHours || field?.timeRange || "").trim(),
    pricePerHour: Number(field?.pricePerHour || field?.price || field?.hourlyPrice || 0),
    rating: Number(field?.rating || 0),
    coverImage,
    article: String(field?.article || field?.description || "").trim(),
    images: Array.isArray(field?.images)
      ? field.images.filter(Boolean)
      : coverImage
        ? [coverImage]
        : [],
    subFields,
    ownerUserId: pickEntityId(
      field?.ownerUserId,
      field?.userId,
      field?.owner?._id,
      field?.owner?.id,
      field?.user?._id,
      field?.user?.id
    ) || null,
    ownerEmail: String(
      field?.ownerEmail
      || field?.userEmail
      || field?.owner?.email
      || field?.user?.email
      || field?.ownerUserId?.email
      || ""
    )
      .trim()
      .toLowerCase(),
    ownerPhone: String(
      field?.ownerPhone
      || field?.userPhone
      || field?.owner?.phone
      || field?.user?.phone
      || field?.ownerUserId?.phone
      || field?.userId?.phone
      || ""
    ).trim(),
    ownerFullName:
      field?.ownerFullName
      || field?.ownerName
      || field?.owner?.name
      || field?.owner?.fullName
      || field?.user?.name
      || field?.user?.fullName
      || field?.ownerUserId?.name
      || field?.ownerUserId?.fullName
      || "",
    approvalStatus: String(field?.approvalStatus || "").trim(),
    status: String(field?.status || field?.fieldStatus || "").trim(),
    isLocked: Boolean(field?.isLocked || field?.locked),
    locked: Boolean(field?.locked || field?.isLocked),
    managedByAdmin: Boolean(
      field?.managedByAdmin
      || field?.ownerUserId
      || field?.userId
      || field?.owner?._id
      || field?.owner?.id
      || field?.user?._id
      || field?.user?.id
    ),
  }

  return {
    ...normalizedField,
    hasCoordinates:
      Number.isFinite(normalizedField.latitude) && Number.isFinite(normalizedField.longitude),
    searchIndex: buildFieldSearchIndex(normalizedField),
  }
}

export const getFieldModerationState = (field) => {
  const rawStatus = String(field?.approvalStatus || field?.status || field?.fieldStatus || "")
    .trim()
    .toUpperCase()
  const isLocked = Boolean(field?.isLocked || field?.locked)

  if (rawStatus === "REJECTED") {
    return "REJECTED"
  }

  if (isLocked || rawStatus === "LOCKED") {
    return "LOCKED"
  }

  if (rawStatus === "PENDING") {
    return "PENDING"
  }

  return "APPROVED"
}

export const isFieldApprovedForPublic = (field) => getFieldModerationState(field) === "APPROVED"

export const createFieldSearchState = () => ({
  keyword: "",
  ward: "",
  city: "",
})

export const getFieldList = (data) => {
  const source = Array.isArray(data?.fields) ? data.fields : Array.isArray(data) ? data : []
  return source.map((field) => normalizeField(field)).filter(Boolean)
}

export const getFieldDetail = (data) => normalizeField(data?.field || data)

export const getFieldTypeSummary = (field) => {
  if (!field) {
    return ""
  }

  const subFieldTypes = Array.isArray(field.subFields)
    ? field.subFields.map((subField) => subField?.type)
    : []
  const uniqueTypes = getUniqueFieldTypes(subFieldTypes.length > 0 ? subFieldTypes : [field.type])
  return uniqueTypes.map((type) => getFieldTypeLabel(type, type)).filter(Boolean).join(", ")
}

export const filterFieldListBySearch = (fields, filters = {}) => {
  const keyword = normalizeSearchText(filters.keyword)
  const ward = normalizeSearchText(filters.ward)
  const city = normalizeSearchText(filters.city)

  return (Array.isArray(fields) ? fields : []).filter((field) => {
    const searchIndex = field?.searchIndex || buildFieldSearchIndex(field || {})

    if (keyword && !searchIndex.keyword.includes(keyword)) {
      return false
    }

    if (ward && !searchIndex.ward.includes(ward)) {
      return false
    }

    if (city && !searchIndex.city.includes(city)) {
      return false
    }

    return true
  })
}

export const getFieldSearchOptions = (fields) => {
  const wardMap = new Map()
  const cityMap = new Map()

  ;(Array.isArray(fields) ? fields : []).forEach((field) => {
    const wardKey = normalizeSearchText(field?.ward)
    const cityKey = normalizeSearchText(field?.city)

    if (wardKey && !wardMap.has(wardKey)) {
      wardMap.set(wardKey, field.ward)
    }

    if (cityKey && !cityMap.has(cityKey)) {
      cityMap.set(cityKey, field.city)
    }
  })

  return {
    wards: Array.from(wardMap.values()).sort((left, right) => left.localeCompare(right, "vi")),
    cities: Array.from(cityMap.values()).sort((left, right) => left.localeCompare(right, "vi")),
  }
}
