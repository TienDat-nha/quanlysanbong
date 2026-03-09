const bcrypt = require("bcryptjs")
const { MongoClient, ObjectId } = require("mongodb")
const seedData = require("./data/db.json")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "sanbong_db"
const MONGODB_SERVER_SELECTION_TIMEOUT_MS = Number(
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 3000
)
const FIELD_SLUG_FALLBACK_PREFIX = "san"

const DEFAULT_DIRECTORY_USERS = Object.freeze([
  { id: 1, name: "Nguyễn Văn An" },
  { id: 2, name: "Trần Thị Bích" },
  { id: 3, name: "Lê Hoàng Minh" },
])

let clientPromise = null
let dbPromise = null
let indexesPromise = null
let seedPromise = null

const normalizeDirectorySeedUsers = () => {
  const seedUsers =
    Array.isArray(seedData.users) && seedData.users.length > 0
      ? seedData.users
      : DEFAULT_DIRECTORY_USERS

  return seedUsers
    .map((user, index) => {
      const normalizedId = Number(user?.id)
      const id = Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : index + 1
      const name = String(user?.name || user?.fullName || "").trim()

      if (!name) {
        return null
      }

      return { id, name }
    })
    .filter(Boolean)
}

const getDirectorySeedUsers = () => normalizeDirectorySeedUsers()

const normalizeFieldSlug = (value, fallback = FIELD_SLUG_FALLBACK_PREFIX) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || String(fallback || FIELD_SLUG_FALLBACK_PREFIX)
}

const createUniqueFieldSlug = async (fieldsCollection, field, excludeId = null) => {
  const baseSlug = normalizeFieldSlug(field?.slug || field?.name, `${FIELD_SLUG_FALLBACK_PREFIX}-${field?.id || "new"}`)
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

const buildDirectoryUserEmail = (id) => `directory-user-${id}@sanbong.local`

const getMongoClient = async () => {
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS:
        Number.isFinite(MONGODB_SERVER_SELECTION_TIMEOUT_MS)
        && MONGODB_SERVER_SELECTION_TIMEOUT_MS > 0
          ? MONGODB_SERVER_SELECTION_TIMEOUT_MS
          : 3000,
    })
    clientPromise = client.connect().catch((error) => {
      clientPromise = null
      throw error
    })
  }

  return clientPromise
}

const getMongoDb = async () => {
  if (!dbPromise) {
    dbPromise = getMongoClient()
      .then((client) => client.db(MONGODB_DB_NAME))
      .catch((error) => {
        dbPromise = null
        throw error
      })
  }

  return dbPromise
}

const ensureMongoIndexes = async () => {
  if (!indexesPromise) {
    indexesPromise = getMongoDb()
      .then(async (db) => {
        await Promise.all([
          db.collection("users").createIndex({ email: 1 }, { unique: true }),
          db.collection("users").createIndex(
            { role: 1, createdAt: -1 },
            { name: "users_role_created" }
          ),
          db.collection("users").createIndex(
            { id: 1 },
            {
              unique: true,
              sparse: true,
              name: "users_public_id_unique",
            }
          ),
          db.collection("email_otps").createIndex(
            { email: 1, purpose: 1, createdAt: -1 },
            { name: "email_otp_lookup" }
          ),
          db.collection("email_otps").createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0, name: "email_otp_expire" }
          ),
          db.collection("bookings").createIndex(
            { userId: 1, createdAt: -1 },
            { name: "bookings_user_created" }
          ),
          db.collection("bookings").createIndex(
            { depositReference: 1 },
            {
              sparse: true,
              name: "bookings_deposit_reference",
            }
          ),
          db.collection("fields").createIndex(
            { id: 1 },
            { unique: true, name: "fields_id_unique" }
          ),
          db.collection("fields").createIndex(
            { slug: 1 },
            { unique: true, sparse: true, name: "fields_slug_unique" }
          ),
          db.collection("fields").createIndex(
            { ownerUserId: 1, createdAt: -1 },
            { sparse: true, name: "fields_owner_created" }
          ),
          db.collection("contacts").createIndex(
            { id: 1 },
            { unique: true, name: "contacts_id_unique" }
          ),
        ])
      })
      .catch((error) => {
        indexesPromise = null
        throw error
      })
  }

  return indexesPromise
}

const getRawCollection = async (name) => {
  const db = await getMongoDb()
  await ensureMongoIndexes()
  return db.collection(name)
}

const ensureCounterValueAtLeast = async (name, nextValue) => {
  if (!Number.isInteger(nextValue) || nextValue < 1) {
    return
  }

  const countersCollection = await getRawCollection("counters")
  const existingCounter = await countersCollection.findOne(
    { _id: name },
    { projection: { _id: 0, value: 1 } }
  )

  if (!existingCounter) {
    await countersCollection.insertOne({
      _id: name,
      value: nextValue,
    })
    return
  }

  if (Number(existingCounter.value || 0) < nextValue) {
    await countersCollection.updateOne(
      { _id: name },
      { $set: { value: nextValue } }
    )
  }
}

const ensureMongoSeedData = async () => {
  if (!seedPromise) {
    seedPromise = (async () => {
      const fieldsCollection = await getRawCollection("fields")
      const existingField = await fieldsCollection.findOne(
        {},
        { projection: { _id: 1 } }
      )

      const fields = Array.isArray(seedData.fields) ? seedData.fields : []
      if (!existingField && fields.length > 0) {
        await fieldsCollection.insertMany(
          fields.map((field) => ({
            ...field,
            slug: normalizeFieldSlug(field.slug || field.name, `${FIELD_SLUG_FALLBACK_PREFIX}-${field.id}`),
            images: Array.isArray(field.images) ? field.images : [],
          }))
        )
      }

      const fieldsWithoutSlug = await fieldsCollection
        .find(
          {
            $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
          },
          {
            projection: {
              _id: 1,
              id: 1,
              name: 1,
              slug: 1,
            },
            sort: { id: 1 },
          }
        )
        .toArray()

      for (const field of fieldsWithoutSlug) {
        const slug = await createUniqueFieldSlug(fieldsCollection, field, field._id)
        await fieldsCollection.updateOne(
          { _id: field._id },
          { $set: { slug } }
        )
      }

      const usersCollection = await getRawCollection("users")
      const existingDirectoryUser = await usersCollection.findOne(
        { directoryVisible: true },
        { projection: { _id: 0, id: 1 } }
      )

      const directoryUsers = normalizeDirectorySeedUsers()
      if (!existingDirectoryUser && directoryUsers.length > 0) {
        const directoryPasswordHash = await bcrypt.hash("directory-user-disabled", 10)

        await usersCollection.insertMany(
          directoryUsers.map((user) => ({
            id: user.id,
            name: user.name,
            fullName: user.name,
            email: buildDirectoryUserEmail(user.id),
            passwordHash: directoryPasswordHash,
            directoryVisible: true,
            createdAt: new Date(),
          }))
        )
      }

      const latestDirectoryUser = await usersCollection.findOne(
        { directoryVisible: true },
        {
          sort: { id: -1 },
          projection: { _id: 0, id: 1 },
        }
      )

      await ensureCounterValueAtLeast(
        "directory_users",
        Number(latestDirectoryUser?.id || 0)
      )

      const latestField = await fieldsCollection.findOne(
        {},
        {
          sort: { id: -1 },
          projection: { _id: 0, id: 1 },
        }
      )

      await ensureCounterValueAtLeast("fields", Number(latestField?.id || 0))
    })().catch((error) => {
      seedPromise = null
      throw error
    })
  }

  return seedPromise
}

const getCollection = async (name) => {
  await ensureMongoSeedData()
  return getRawCollection(name)
}

const getUsersCollection = async () => getCollection("users")
const getEmailOtpsCollection = async () => getCollection("email_otps")
const getBookingsCollection = async () => getCollection("bookings")
const getFieldsCollection = async () => getCollection("fields")
const getContactsCollection = async () => getCollection("contacts")

const getNextSequenceValue = async (name) => {
  const countersCollection = await getRawCollection("counters")
  const counter = await countersCollection.findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    {
      upsert: true,
      returnDocument: "after",
      includeResultMetadata: false,
    }
  )

  return Number(counter?.value || 1)
}

const toObjectId = (value) => {
  if (!ObjectId.isValid(value)) {
    return null
  }

  return new ObjectId(value)
}

const closeMongoClient = async () => {
  const client = await clientPromise?.catch(() => null)
  clientPromise = null
  dbPromise = null
  indexesPromise = null
  seedPromise = null

  if (client) {
    await client.close()
  }
}

module.exports = {
  closeMongoClient,
  ensureMongoIndexes,
  ensureMongoSeedData,
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
}

//tiendat82282_db_user
//yuO2TUG1hKFPUoq8
