const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "d43bd7c421268b",
    pass: "331e761ad54684"
  }
});

async function sendPasswordEmail(toEmail, username, password) {
  const info = await transporter.sendMail({
    from: '"Admin System" <no-reply@example.com>',
    to: toEmail,
    subject: 'Thông tin tài khoản của bạn',
    html: `
      <h2>Xin chào ${username}</h2>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <p><strong>Email:</strong> ${toEmail}</p>
      <p><strong>Mật khẩu:</strong> ${password}</p>
      <p>Vui lòng đăng nhập và đổi mật khẩu sớm nhất có thể.</p>
    `
  });

  return info;
}

module.exports = sendPasswordEmail;