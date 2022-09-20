const nodemailer = require("nodemailer");

async function sendMail(options) {
  let transporter = nodemailer.createTransport({
    pool: true,
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use TLS
    auth: {
      user: "praveen@etech-services.com",
      pass: "shimla@123",
    },
  });
  let info = await transporter.sendMail({
    from: options.from, // sender address
    to: "vikas@etech-services.com",//options.to, // list of receivers
    subject: options.subject, // Subject line
    text: options.text, // plain text body
    html: options.html, // html body
  });
  console.log("Mail sent successfully...", info);
}
function sendMail2(options) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "support@etech-services.com",
        pass: "etech#$%@325",
      }
    });
    transporter.sendMail(
      {
        from: options.from, // sender address
        to: options.to, // list of receivers
        subject: options.subject, // Subject line
        text: options.text, // plain text body
        html: options.html, // html body
      },
      function (err, result) {
      if (err) reject(err);
        resolve(result);
      }
    );
  });
}
module.exports = {
  sendMail,
  sendMail2
};
