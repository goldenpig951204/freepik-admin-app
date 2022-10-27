const settingModel = require("../models/setting");
const { freepikLog } = require("../services/logger");
const { get } = require("lodash");
const dvAxios = require("devergroup-request").default;
const parseHTML = require("jquery-html-parser");
const Captcha = require("2captcha");
const puppeteer = require("puppeteer-extra");

const axios = new dvAxios({
    axiosOpt: {
        timeout: 30000
    }
});

const login = async (req, res) => {
    let { email, password } = req.body;
    
    const solver = new Captcha.Solver("1cca50f7c9ce7bacaa1cb447e3ec2bbd");
    let { data } = await solver.recaptcha("6LeggwQfAAAAAH1xHP3gi4BL5Rs5BwetrlWrRt4a", "https://id.freepikcompany.com/v2/log-in?client_id=freepik&lang=en");
    let body = JSON.stringify({
        email,
        password,
        keepSigned: false,
        recaptchaToken: data,
        lang: "en-US"
    });
    let response = await axios.instance.post(
        "https://id-api.freepikcompany.com/v2/login?client_id=freepik", 
        body,
        {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                "Content-Type": "application/json; charset=UTF-8",
                "Content-Length": Buffer.from(body, 'utf-8')
            }
        }
    );
    if (response.data.success) {
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
        await page.goto(response.data.data.redirectUrl, {waitUntil: 'load', timeout: 100000});
        let cookies = await page.cookies();
        await browser.close(true);
        let cookie = "";
        for( let idx in cookies) {
            cookie += cookies[idx].name + "=" + cookies[idx].value + "; ";
        }
        await settingModel.findOneAndUpdate(null, {
            freepikCookie: cookie
        }, {
            upsert: true
        });
        freepikLog.info(`Start session with ${email} successfully.`);
        res.send("Login successfully.");
    } else {
        freepikLog.error(`Start session with ${email} failed`)
        res.status(500).send("Credential is incorrect.");
    }

}

module.exports = {
    login
};