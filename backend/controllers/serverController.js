const { app } = require("../routes")
const { closeMongoClient } = require("../models/mongo")

const DEFAULT_PORT = Number(process.env.PORT || 5000)

const startServer = (port = DEFAULT_PORT) => {
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`SanBong API đang chạy tại http://localhost:${port}`)
  })

  let isShuttingDown = false

  const shutdown = async () => {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true

    server.close(async () => {
      await Promise.allSettled([closeMongoClient()])
      process.exit(0)
    })
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  return server
}

module.exports = {
  startServer,
}
