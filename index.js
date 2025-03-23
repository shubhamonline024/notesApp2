const express = require('express');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/:blogUrl', async (req, res) => {
  try {
    let blogUrl = decodeURIComponent(req.params.blogUrl);
    console.log('Fetching:', blogUrl);

    // Fetch the blog page
    const response = await axios.get(blogUrl);
    const html = await response.data;

    // Parse HTML with jsdom
    const doc = new JSDOM(html, { url: blogUrl });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(500).send('Could not extract readable content.');
    }

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(article.content);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    // Send the PDF file to the user
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="blog.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing the blog page.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
