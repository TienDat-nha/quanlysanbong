export const FIELD_TYPES = Object.freeze({
  five: "5-nguoi",
  seven: "7-nguoi",
  eleven: "11-nguoi",
  futsal: "futsal",
})

export const FIELD_TYPE_OPTIONS = Object.freeze([
  { value: FIELD_TYPES.five, label: "Sân 5" },
  { value: FIELD_TYPES.seven, label: "Sân 7" },
  { value: FIELD_TYPES.eleven, label: "Sân 11" },
  { value: FIELD_TYPES.futsal, label: "Futsal" },
])

export const DEFAULT_FIELD_TYPE = FIELD_TYPE_OPTIONS[1].value

const normalizeAsciiToken = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

export const normalizeFieldType = (value, fallback = "") => {
  const rawValue = String(value || "").trim()
  const normalizedToken = normalizeAsciiToken(rawValue)

  if (!normalizedToken) {
    return String(fallback || "").trim()
  }

  if (normalizedToken.includes("futsal")) {
    return FIELD_TYPES.futsal
  }

  if (normalizedToken.includes("11")) {
    return FIELD_TYPES.eleven
  }

  if (normalizedToken.includes("7")) {
    return FIELD_TYPES.seven
  }

  if (normalizedToken.includes("5")) {
    return FIELD_TYPES.five
  }

  return String(fallback || "").trim()
}

export const getFieldTypeLabel = (value, fallback = "") => {
  const normalizedValue = normalizeFieldType(value, "")

  switch (normalizedValue) {
    case FIELD_TYPES.five:
      return "Sân 5"
    case FIELD_TYPES.seven:
      return "Sân 7"
    case FIELD_TYPES.eleven:
      return "Sân 11"
    case FIELD_TYPES.futsal:
      return "Futsal"
    default:
      return String(fallback || value || "").trim()
  }
}

export const getUniqueFieldTypes = (values) => {
  const uniqueTypes = []

  ;(Array.isArray(values) ? values : []).forEach((value) => {
    const normalizedValue = normalizeFieldType(value, String(value || "").trim())
    if (normalizedValue && !uniqueTypes.includes(normalizedValue)) {
      uniqueTypes.push(normalizedValue)
    }
  })

  return uniqueTypes
}
