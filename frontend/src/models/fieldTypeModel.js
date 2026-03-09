export const FIELD_TYPE_OPTIONS = Object.freeze([
  { value: "Sân 5", label: "Sân 5" },
  { value: "Sân 7", label: "Sân 7" },
  { value: "Sân 11", label: "Sân 11" },
  { value: "Futsal", label: "Futsal" },
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
