import { getUniqueFieldTypes, normalizeFieldType } from "./fieldTypeModel"

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

const detectWardSegment = (value) => {
  const normalized = normalizeSearchText(value)
  return /^(phuong|p|xa|x|thi tran|tt)\b/.test(normalized) ? String(value || "").trim() : ""
}

const detectCitySegment = (value) => {
  const normalized = normalizeSearchText(value)

  if (/^(thanh pho|tp|tinh)\b/.test(normalized)) {
    return String(value || "").trim()
  }

  if (
    normalized.includes("ho chi minh")
    || normalized === "hcm"
    || normalized === "tphcm"
    || normalized.includes("ha noi")
    || normalized.includes("da nang")
    || normalized.includes("can tho")
    || normalized.includes("hai phong")
  ) {
    return String(value || "").trim()
  }

  return ""
}

const extractLocationParts = (address, district) => {
  const segments = splitLocationSegments(address, district)

  let ward = ""
  let city = ""

  segments.forEach((segment) => {
    if (!ward) {
      ward = detectWardSegment(segment)
    }

    if (!city) {
      city = detectCitySegment(segment)
    }
  })

  if (!city && segments.length >= 3) {
    const lastSegment = segments[segments.length - 1]
    const normalizedLast = normalizeSearchText(lastSegment)
    const normalizedDistrict = normalizeSearchText(district)

    if (
      normalizedLast
      && normalizedLast !== normalizedDistrict
      && !detectWardSegment(lastSegment)
    ) {
      city = lastSegment
    }
  }

  return {
    ward,
    city,
  }
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
  const address = String(field?.address || "").trim()
  const district = String(field?.district || "").trim()
  const subFields = normalizeSubFields(field?.subFields, field)
  const locationParts = extractLocationParts(address, district)

  const normalizedField = {
    id,
    name,
    slug: String(field?.slug || "").trim() || buildFallbackSlug(name, `san-${id}`),
    address,
    district,
    ward: locationParts.ward,
    city: locationParts.city,
    latitude: Number.isFinite(Number(field?.latitude)) ? Number(field.latitude) : null,
    longitude: Number.isFinite(Number(field?.longitude)) ? Number(field.longitude) : null,
    type: normalizeFieldType(field?.type, String(field?.type || "").trim()),
    openHours: String(field?.openHours || "").trim(),
    pricePerHour: Number(field?.pricePerHour || 0),
    rating: Number(field?.rating || 0),
    coverImage,
    article: String(field?.article || "").trim(),
    images: Array.isArray(field?.images)
      ? field.images.filter(Boolean)
      : coverImage
        ? [coverImage]
        : [],
    subFields,
    ownerUserId: field?.ownerUserId || null,
    ownerFullName: field?.ownerFullName || "",
    managedByAdmin: Boolean(field?.managedByAdmin || field?.ownerUserId),
  }

  return {
    ...normalizedField,
    hasCoordinates:
      Number.isFinite(normalizedField.latitude) && Number.isFinite(normalizedField.longitude),
    searchIndex: buildFieldSearchIndex(normalizedField),
  }
}

export const createFieldSearchState = () => ({
  keyword: "",
  ward: "",
  city: "",
})

export const getFieldList = (data) => {
  const source = Array.isArray(data?.fields) ? data.fields : []
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

  return uniqueTypes.join(", ")
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
