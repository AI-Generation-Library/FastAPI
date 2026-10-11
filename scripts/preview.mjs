import http from "node:http"
import handler from "serve-handler"

const port = Number(process.env.PORT || 8080)
const server = http.createServer((request, response) => handler(request, response, {
  public: "dist",
  cleanUrls: true,
  directoryListing: false,
}))
server.listen(port, "127.0.0.1", () => {
  console.log(`Local: http://127.0.0.1:${port}`)
})
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
