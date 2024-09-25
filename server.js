const axios = require('axios');
// const puppeteer = require('puppeteer');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Function to scrape content from a given URL using Puppeteer
async function scrapeWebsiteContent(url) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Set a custom user agent to mimic a regular browser
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        );

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const content = await page.evaluate(() => document.body.innerText);

        await browser.close();
        return content;
    } catch (error) {
        console.error(`Failed to scrape ${url}:`, error.message);
        return '';
    }
}

// Function to search Google Custom Search for trading websites
async function fetchTradingWebsites(query) {
    try {
        const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CX,
                q: query,
            },
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching from Google Search API:', error.message);
        return [];
    }
}

// Function to generate suggestions from OpenAI
async function generateSuggestions(websitesWithContent) {
    const prompt = `${websitesWithContent.map((site, index) => `${index + 1}. ${site.title} - ${site.link}`).join('\n')}

    Analyze the content and current market trends found on these websites. Provide a detailed summary of the following:
    1. General market sentiment based on recent discussions, news, or articles.
    2. Any emerging trends in specific sectors or asset classes (e.g., technology, energy, cryptocurrencies).
    3. Highlight areas or markets that appear to be receiving significant attention (even if they aren't guaranteed to be "most beneficial").
    4. Explain any potential risks or uncertainties that are being discussed or could impact the market.
    
    Please focus on summarizing the overall sentiment and trends ans also make specific investment recommendations.
    the out should be clear and clean and avoid includeing ***'s and newlines\n
    `;

    try {
        
        const FirstResponse = await model.generateContent(prompt);
        // console.log(FirstResponse.response.text());
        return FirstResponse.response.text();
    } catch (error) {
        console.error('Error generating ranking from OpenAI:', error.message);
        return '';
    }
}


// Main function to fetch and analyze websites
async function main() {
    const searchQuery = `Please analyze the content and current market trends found on the following websites related to trading. Provide a detailed summary of:

General market sentiment based on recent discussions or articles.
Any emerging trends in specific sectors or asset classes in all areas of marketing.
Areas or markets that are receiving significant attention from users or experts.
Any potential risks or uncertainties being discussed that could impact the market.
Focus on identifying broader patterns or topics of interest`;

    // Step 1: Fetch trading websites from Google Custom Search
    const websites = await fetchTradingWebsites(searchQuery);

    

    if (websites.length > 0) {
        // Step 2: Scrape each website for content
        const websitesWithContent = [];
        for (let site of websites) {
            const content = await scrapeWebsiteContent(site.link);
            websitesWithContent.push({
            title: site.title,
                link: site.link,
                content: content,
            });
        }
        // console.log(websitesWithContent);
        // Step 3: Analyze the scraped content using OpenAI/Gemini
        const insights = await generateSuggestions(websitesWithContent);

        // Step 4: Output the insights
        console.log('Current Trading Insights:');
        console.log(insights);
    } else {
        console.log('No websites found for the query.');
    }
}

// Run the main function
main();
