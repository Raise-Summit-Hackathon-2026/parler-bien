#!/usr/bin/env bun
/**
 * Converts markdown training sources to PDF fixtures.
 * Usage: bun run generate:training-pdfs
 */

import { readdir, readFile, mkdir } from "node:fs/promises"
import { join, basename } from "node:path"
import PDFDocument from "pdfkit"

const ROOT = join(import.meta.dir, "..")
const SOURCE_DIR = join(ROOT, "fixtures/training-pdfs/source")
const OUTPUT_DIR = join(ROOT, "fixtures/training-pdfs")

const MARGIN = 54
const PAGE_WIDTH = 612
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

type Block =
  | { kind: "title"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "table-row"; cells: string[] }
  | { kind: "bullet"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "hr" }

function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = []
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    const trimmed = line.trim()

    if (!trimmed) continue

    if (trimmed === "---") {
      blocks.push({ kind: "hr" })
      continue
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "title", text: trimmed.slice(2).trim() })
      continue
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(3).trim() })
      continue
    }

    if (trimmed.startsWith("**Company:**") || trimmed.startsWith("**Doc ID:**")) {
      blocks.push({ kind: "meta", text: stripBold(trimmed) })
      continue
    }

    if (trimmed.startsWith("> ")) {
      blocks.push({ kind: "quote", text: trimmed.slice(2).trim() })
      continue
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim())
      if (cells.every((c) => /^[-:]+$/.test(c))) continue
      blocks.push({ kind: "table-row", cells })
      continue
    }

    if (trimmed.startsWith("- **") && trimmed.includes(":**")) {
      blocks.push({ kind: "bold", text: stripBold(trimmed.slice(2)) })
      continue
    }

    if (trimmed.startsWith("- ")) {
      blocks.push({ kind: "bullet", text: trimmed.slice(2).trim() })
      continue
    }

    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      blocks.push({ kind: "bold", text: stripBold(trimmed) })
      continue
    }

    blocks.push({ kind: "paragraph", text: stripBold(trimmed) })
  }

  return blocks
}

function stripBold(text: string): string {
  return text.replace(/\*\*/g, "")
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - MARGIN) {
    doc.addPage()
  }
}

function renderBlocks(doc: PDFKit.PDFDocument, blocks: Block[]) {
  for (const block of blocks) {
    switch (block.kind) {
      case "title":
        ensureSpace(doc, 40)
        doc
          .font("Helvetica-Bold")
          .fontSize(16)
          .fillColor("#1a1a1a")
          .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH })
        doc.moveDown(0.5)
        break

      case "meta":
        ensureSpace(doc, 16)
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#444444")
          .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH })
        doc.moveDown(0.3)
        break

      case "h2":
        doc.moveDown(0.4)
        ensureSpace(doc, 24)
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#222222")
          .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH })
        doc.moveDown(0.35)
        break

      case "quote":
        ensureSpace(doc, 20)
        doc
          .font("Courier")
          .fontSize(9.5)
          .fillColor("#333333")
          .text(block.text, MARGIN + 12, doc.y, {
            width: CONTENT_WIDTH - 24,
            indent: 8,
          })
        doc.moveDown(0.25)
        break

      case "table-row": {
        ensureSpace(doc, 16)
        const [col1 = "", col2 = ""] = block.cells
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333")
        doc.text(col1, MARGIN, doc.y, { width: 180, continued: false })
        const rowY = doc.y - doc.currentLineHeight()
        doc.font("Helvetica").fontSize(9).text(col2, MARGIN + 185, rowY, {
          width: CONTENT_WIDTH - 185,
        })
        doc.moveDown(0.15)
        break
      }

      case "bullet":
        ensureSpace(doc, 14)
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#1a1a1a")
          .text(`•  ${block.text}`, MARGIN + 8, doc.y, {
            width: CONTENT_WIDTH - 16,
          })
        doc.moveDown(0.15)
        break

      case "bold":
        ensureSpace(doc, 14)
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#1a1a1a")
          .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH })
        doc.moveDown(0.15)
        break

      case "paragraph":
        ensureSpace(doc, 14)
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#1a1a1a")
          .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "left" })
        doc.moveDown(0.2)
        break

      case "hr":
        doc.moveDown(0.3)
        ensureSpace(doc, 8)
        doc
          .strokeColor("#cccccc")
          .moveTo(MARGIN, doc.y)
          .lineTo(PAGE_WIDTH - MARGIN, doc.y)
          .stroke()
        doc.moveDown(0.5)
        break
    }
  }
}

async function markdownToPdf(sourcePath: string, outputPath: string) {
  const content = await readFile(sourcePath, "utf8")
  const blocks = parseMarkdown(content)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: blocks.find((b) => b.kind === "title")?.text ?? basename(sourcePath),
        Creator: "parler-bien generate-training-pdfs",
      },
    })

    const stream = Bun.file(outputPath).writer()
    doc.on("data", (chunk: Buffer) => stream.write(chunk))
    doc.on("end", async () => {
      await stream.end()
      resolve()
    })
    doc.on("error", reject)

    renderBlocks(doc, blocks)
    doc.end()
  })
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const files = (await readdir(SOURCE_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort()

  if (files.length === 0) {
    console.error("No markdown sources found in", SOURCE_DIR)
    process.exit(1)
  }

  for (const file of files) {
    const base = basename(file, ".md")
    const sourcePath = join(SOURCE_DIR, file)
    const outputPath = join(OUTPUT_DIR, `${base}.pdf`)
    await markdownToPdf(sourcePath, outputPath)
    const stat = await Bun.file(outputPath).stat()
    console.log(`✓ ${base}.pdf (${(stat.size / 1024).toFixed(1)} KB)`)
  }

  console.log(`\nGenerated ${files.length} PDFs in ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
