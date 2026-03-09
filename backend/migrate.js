const path = require("path")
require("dotenv").config({ path: path.join(__dirname, ".env") })

const {
  closeMongoClient,
  getDirectorySeedUsers,
  ensureMongoIndexes,
  ensureMongoSeedData,
} = require("./models/mongo")

const main = async () => {
  await ensureMongoIndexes()
  await ensureMongoSeedData()
  const users = getDirectorySeedUsers()

  // eslint-disable-next-line no-console
  console.log(
    `Khởi tạo MongoDB hoàn tất. Người dùng sẵn sàng: ${users.length}. Kiểm tra với GET /users, GET /users/1 và frontend /users.`
  )
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(
      "Khởi tạo MongoDB thất bại:",
      error && (error.message || error.code || JSON.stringify(error))
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await closeMongoClient()
  })
