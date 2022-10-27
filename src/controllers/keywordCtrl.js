const settingModel = require("../models/setting");
const { keywordLog } = require("../services/logger");
const { get } = require("lodash");
const dvAxios = require("devergroup-request").default;
const axios = new dvAxios({
    axiosOpt: {
        timeout: 30000
    }
});

const login = async (req, res) => {
    let { email, password } = req.body;
    try {
        let response = await axios.instance.get("https://www.keywordrevealer.com/api/auth/csrf");
        let { csrfToken } = response.data;
        let callbackUrl = "https://www.keywordrevealer.com/keyword-research";
        let body = `email=${email}&password=${password}&callbackUrl=${callbackUrl}&csrfToken=${csrfToken}&json=true`;
        response = await axios.instance.post(
            "https://www.keywordrevealer.com/api/auth/callback/credentials", 
            body,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Content-Length": Buffer.byteLength(body),
                    "Host": "www.keywordrevealer.com",
                    "Referer": "https://www.keywordrevealer.com/login"
                }
            }
        );
        console.log(response.data)
        if (response.data && response.data.url == callbackUrl) {
            let cookie =  axios.cookieJar.getCookieStringSync(callbackUrl);
            console.log(cookie);
            await settingModel.findOneAndUpdate(null, {
                keywordrevealerCookie: cookie
            }, {
                upsert: true
            });
            keywordLog.info(`Start session with ${email} successfully.`);
            res.send("Login successfully.");
        } else {
            res.status(500).send("Credential is incorrect.");
        }
    } catch (err) {
        keywordLog.error(`Start session with ${email} failed: ${get(err, "response.data.message") || err.toString()}`);
        res.status(500).send(get(err, "response.data.message") || err.toString());
    }
}

module.exports = {
    login
};