const settingModel = require("../models/setting");
const { pipiadsLog } = require("../services/logger");
const { get } = require("lodash");
const puppeteer = require("puppeteer-extra");

const login = async (req, res) => {
    let { email, password } = req.body;
    try {
        const windowsLikePathRegExp = /[a-z]:\\/i;
        let inProduction = false;

        if (! windowsLikePathRegExp.test(__dirname)) {
            inProduction = true;
        }
        let options = {};
        if (inProduction) {
            options = {
                headless : true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--media-cache-size=0',
                    '--disk-cache-size=0',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                ],
                timeout: 100000,
            };
        } else {
            options = {
                headless : false,
                timeout: 100000,
                args: [
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                ],
            };
        }
        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();
        await page.goto('https://www.pipiads.com/login', {waitUntil: 'load', timeout: 100000});
        await page.focus("input[type='text']").then(async () => {
            await page.keyboard.type(email, { delpay: 100 });
        });
        await page.focus("input[type='password']").then(async () => {
            await page.keyboard.type(password, { delpay: 100 });
        });
        await page.click('button');
        page.on('response', async response => {
            if (/\/api\/member\/login/.test(response.url())) {
                let request = await response.request();
                let postData = JSON.parse(request.postData());
                console.log(postData.device_id);
                let buffer = await response.buffer();
                let bodyStr = buffer.toString("utf8")
                let body = JSON.parse(bodyStr);
                if (typeof body.code == "undefined") {
                    // success
                    let headers = response.headers();
                    let cookie = {
                        "uid": headers["set-cookie"].replace("uid=", ""),
                        "PP-userInfo": body,
                        "device_id": postData.device_id
                    }
                    await settingModel.findOneAndUpdate(null, {
                        pipiadsCookie: JSON.stringify(cookie)
                    }, {
                        upsert: true
                    });
                    pipiadsLog.info(`Start session with ${email} successfully.`);
                    res.send('Login successfully.');
                } else {
                    // failed
                    pipiadsLog.error(`Start session with ${email} failed.`);
                    res.status(500).send("Credential is incorrect.");
                }
                await browser.close(true);
            }
        });
    } catch (err) {
        pipiadsLog.error(`Start session with ${email} failed: ${get(err, "response.data.message")}`);
        res.status(500).send(get(err, "response.data.message") || err.toString());
    }
}

module.exports = {
    login
};