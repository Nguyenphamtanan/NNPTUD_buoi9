var express = require('express');
var router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');

const userSchema = require('../schemas/users');
const roleSchema = require('../schemas/roles');
const generateRandomPassword = require('../utils/passwordGenerator');
const sendPasswordEmail = require('../utils/sendMailHandler');

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async function (req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).send({
        message: 'Vui lòng upload file Excel'
      });
    }

    const userRole = await roleSchema.findOne({ name: 'user' });

    if (!userRole) {
      return res.status(400).send({
        message: 'Không tìm thấy role user trong database'
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let results = [];
    let errors = [];

    for (const row of sheetData) {
      try {
        const username = row.username ? String(row.username).trim() : '';
        const email = row.email ? String(row.email).trim() : '';

        if (!username || !email) {
          errors.push({
            row,
            message: 'Thiếu username hoặc email'
          });
          continue;
        }

        const existedUser = await userSchema.findOne({
          $or: [{ username: username }, { email: email }]
        });

        if (existedUser) {
          errors.push({
            row,
            message: 'Username hoặc email đã tồn tại'
          });
          continue;
        }

        const rawPassword = generateRandomPassword(16);

        const newUser = new userSchema({
          username: username,
          email: email,
          password: rawPassword,
          role: userRole._id
        });

        await newUser.save();

        await sendPasswordEmail(email, username, rawPassword);

        results.push({
          username,
          email,
          password: rawPassword,
          message: 'Import thành công và đã gửi email'
        });
      } catch (err) {
        errors.push({
          row,
          message: err.message
        });
      }
    }

    return res.status(200).send({
      message: 'Import users hoàn tất',
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    });
  } catch (error) {
    return res.status(500).send({
      message: error.message
    });
  }
});

module.exports = router;