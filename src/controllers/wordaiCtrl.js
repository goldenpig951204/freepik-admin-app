const settingModel = require("../models/setting");
const { wordaiLog } = require("../services/logger");
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
        let response = await axios.instance.get("https://wai.wordai.com/users/sign_in");
        let cookie = response.headers["set-cookie"][0];
        let $ = parseHTML(response.data);
        let authenticityToken = $("meta[name='csrf-token']").attr("content");
        let body = `authenticity_token=${authenticityToken}&user[email]=${email}&user[password]=${password}&user[remember_me]=1`;
        response = await axios.instance.post(
            "https://wai.wordai.com/users/sign_in",
            body,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Content-Length": Buffer.byteLength(body),
                    "Cookie": cookie,
                    "Host": "wai.wordai.com",
                    "Referer": "https://wai.wordai.com/users/sign_in"
                }
            }
        );
        if (response.status == 200) {
            cookie = axios.cookieJar.getCookieStringSync("https://wai.wordai.com");
            await settingModel.findOneAndUpdate(null, {
                wordaiCookie: cookie
            }, {
                upsert: true
            });
            wordaiLog.info(`Start session with ${email} successfully.`);
            res.send("Login successfully.");
        } else {
            res.status(500).send("Credential is incorrect.");
        }
    } catch (err) {
        wordaiLog.error(`Start session with ${email} failed: ${get(err, "response.data.message") || err.toString()}`);
        res.status(500).send(get(err, "response.data.message") || err.toString());
    }
}

module.exports = {
    login
};