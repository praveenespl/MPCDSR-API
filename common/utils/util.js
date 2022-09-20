const request = require("request");
/**
 *
 * *parameter is object & in object you need to pass these 3 values
 * @param mobileNum
 * @param url
 * @param formatedMessage
 */
async function SendMessage(param) {
    if (param) {
        // console.log("param : ", param);
        try {
            let url = param.url;
            url = url.replace("<mob>", param.mobileNum);
            url = url.replace("<text>", param.formatedMessage);
            // console.log("=================================");
            // console.log("formatedMessage : ", param.formatedMessage);
            // console.log("Normal URL : ", url);
            // console.log("URL : ", encodeURI(url));

            const sendMessageResult = await request({
                method: "GET",
                url: encodeURI(url),
                gzip: true,
            });

            if (!sendMessageResult) {
                const err = new Error("Mobile number is Invalid.");
                err.statusCode = 404;
                err.code = "Wrong Mobile Number";
                throw err;
            }
        } catch (err) {
            return err;
        }
    } else {
        const err = new Error();
        err.statusCode = 404;
        err.code = "Parameters are required";
        return err;
    }
}
// Alumni sms 1
// http://www.commnestsms.com/api/push.json?apikey=5ebd30ecf3dac&route=transpromo&sender=WTCREF&mobileno=9899658650&text=जागतिक शौचालय महाविद्यालय स्वच्छता कर्मी करिता ऑनलाइन प्रशिक्षणाचीसंधी

// Alumni SMS 2
// http://www.commnestsms.com/api/push.json?apikey=5ebd30ecf3dac&route=transpromo&sender=WTCREF&mobileno=9899658650&text=आपण रु २५० पर्यंत पैसे मिळू शकता अधिक माहितीकरिता www.domainname.com

// On Registration of Referral sms to be sent to Alumni
// http://www.commnestsms.com/api/push.json?apikey=5ebd30ecf3dac&route=transpromo&sender=WTCREF&mobileno=9899658650&text=जा शौ म कडून प्रवीण चे नाव सुचविले रु.५० प्राप्त

// OTP
// http://www.commnestsms.com/api/push.json?apikey=5ebd30ecf3dac&route=otp&sender=WTCREF&mobileno=9899658650&text=या कामाकरिता आपण 125472 हा ओ टी पी वापरावा
// exports the variables and functions above so that other modules can use them
module.exports.SendMessage = SendMessage;