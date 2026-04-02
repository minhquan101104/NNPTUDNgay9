const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "",
        pass: "",
    },
});
module.exports = {
    sendMail: async function (to, url) {
        const info = await transporter.sendMail({
            from: 'hehehe@gmail.com',
            to: to,
            subject: "reset password URL",
            text: "click vao day de doi pass", // Plain-text version of the message
            html: "click vao <a href=" + url + ">day</a> de doi pass", // HTML version of the message
        });

        console.log("Message sent:", info.messageId);
    },
    sendAccountPasswordMail: async function (to, username, password) {
        const info = await transporter.sendMail({
            from: "hehehe@gmail.com",
            to: to,
            subject: "Thong tin tai khoan moi",
            text: `Tai khoan: ${username}\nMat khau tam thoi: ${password}\nVui long doi mat khau sau khi dang nhap.`,
            html: `Tai khoan: <b>${username}</b><br/>Mat khau tam thoi: <b>${password}</b><br/>Vui long doi mat khau sau khi dang nhap.`,
        });

        console.log("Message sent:", info.messageId);
    }
}
