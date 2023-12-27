import puppeteer from 'puppeteer';
// import * as fs from 'fs';
import FILES_PATH_CONFIG from '../config/url.js';

export const createPdfFromHtml = async (htmlPage, fileName, pathPrefix = '') => {
    try {
        // for dev
        const mainBrowser = await puppeteer.launch({
            headless: 'new',
        });
        // for production
        // const mainBrowser = await puppeteer.launch({
        //     executablePath: '/usr/bin/chromium-browser',
        //     args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote'],
        // });
        const basePath = !pathPrefix ? FILES_PATH_CONFIG.UPLOAD : pathPrefix;
        const mainPage = await mainBrowser.newPage();
        await mainPage.setContent(htmlPage);
        await mainPage.emulateMediaType('screen');
        const pdf = await mainPage.pdf({
            path: `${basePath}${fileName}.pdf`,
            format: 'a4',
            printBackground: true,
        });
        await mainBrowser.close();
        // fs.unlink(`${FILES_PATH_CONFIG.UPLOAD}${fileName}.pdf`, (err) => {
        //     if (err) {
        //         console.error(err);
        //     }
        // });
        return pdf;
    } catch (err) {
        err.message = `createPdfFromHtml-> ${err.message}`;
        throw (err);
    }
};
