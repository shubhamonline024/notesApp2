require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  try {
    const url = req.query.link ? req.query.link : null;
    if (!url) {
      return res.status(400).send("NO URL FOUND");
    }

    // Decode the URL safely
    const blogUrl = decodeURIComponent(url);

    // Fetch the blog page
    const response = await axios.get(blogUrl);
    const html = response.data; // Directly access response.data as it's already resolved

    // Parse HTML with jsdom
    const doc = new JSDOM(html, { url: blogUrl });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).send("Could not extract readable content.");
    }

    // Generate PDF from the extracted content
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(article.content, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // Include background graphics (useful if your page has background colors or images)
      margin: { top: "0.8in", bottom: "0.8in", left: "0.8in", right: "0.8in" },
    });
    await browser.close();

    const finalBuffer = Buffer.from(pdfBuffer);
    // Send the PDF file to the user
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="blog.pdf"`,
    });
    res.end(finalBuffer);
  } catch (error) {
    console.error("Error processing blog page:", error);
    res.status(500).send("Error processing the blog page.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
