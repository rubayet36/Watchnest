import fs from 'fs'
import path from 'path'

const walk = (dir) => {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath))
    } else if (file === 'route.js') {
      results.push(filePath)
    }
  })
  return results
}

const apiDir = path.join(process.cwd(), 'app', 'api')
const routes = walk(apiDir)

let updatedCount = 0

routes.forEach((route) => {
  let content = fs.readFileSync(route, 'utf8')
  if (!content.includes('export const runtime =') && !content.includes("export const runtime=")) {
    content = `export const runtime = 'edge'\n\n` + content
    fs.writeFileSync(route, content)
    updatedCount++
    console.log(`Updated: ${route}`)
  }
})

console.log(`Done. Added edge runtime to ${updatedCount} API routes.`)
