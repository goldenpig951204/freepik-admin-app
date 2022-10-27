const settingModel = require("../models/setting");
const { nicheLog } = require("../services/logger");
const { get } = require("lodash");
const dvAxios = require("devergroup-request").default;
const parseHTML = require("jquery-html-parser");
const axios = new dvAxios({
    axiosOpt: {
        timeout: 30000
    }
});

const login = async (req, res) => {
    let { email, password } = req.body;
    try {
        let body = `email=${email}&password=${password}&t=&login=`;
        let response = await axios.instance.post(
            "https://nichescraper.com/login.php",
            body,
            {
                headers: {
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                    "content-type": "application/x-www-form-urlencoded",
                    "content-length": Buffer.byteLength(body),
                }
            }
        );
        $ = parseHTML(response.data)
        let text = $("body .navbar ul.navbar-nav > li:nth-child(1)").text();
        if (text.trim() == "login") {
            nicheLog.error(`Start session with ${email} failed.`);
            res.status(500).send("Credentials is incorrect.");
        } else {
            let cookie = axios.cookieJar.getCookieStringSync("https://nichescraper.com");
            await settingModel.findOneAndUpdate(null, {
                nichescraperCookie: cookie
            }, {
                upsert: true
            });
            nicheLog.info(`Start session with ${email} successfully.`);
            res.send("Login successfully.");
        }
        
    } catch (err) {
        nicheLog.error(`Start session with ${email} failed: ${get(err, "response.data.message") || err.toString()}`);
        res.status(500).send(get(err, "response.data.message") || err.toString());
    }
}

module.exports = {
    login
};