var express = require("express");
var router = express.Router();
const multer = require("multer");
const path = require("path");

const messageSchema = require("../schemas/messages");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

/*
  GET /api/v1/messages/:userID?currentUser=...
  Lấy toàn bộ message giữa currentUser và userID
*/
router.get("/:userID", async function (req, res, next) {
  try {
    const currentUser = req.query.currentUser;
    const otherUser = req.params.userID;

    if (!currentUser) {
      return res.status(400).send({
        message: "Thiếu currentUser"
      });
    }

    const messages = await messageSchema
      .find({
        $or: [
          { from: currentUser, to: otherUser },
          { from: otherUser, to: currentUser }
        ]
      })
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl")
      .sort({ createdAt: 1 });

    return res.status(200).send(messages);
  } catch (error) {
    return res.status(500).send({
      message: error.message
    });
  }
});

/*
  POST /api/v1/messages
  form-data:
  - from: currentUserID
  - to: userID
  - text: nội dung text (nếu gửi text)
  - file: file upload (nếu gửi file)
*/
router.post("/", upload.single("file"), async function (req, res, next) {
  try {
    const { from, to, text } = req.body;

    if (!from || !to) {
      return res.status(400).send({
        message: "Thiếu from hoặc to"
      });
    }

    let newMessage;

    if (req.file) {
      newMessage = new messageSchema({
        from: from,
        to: to,
        messageContent: {
          type: "file",
          text: req.file.path
        }
      });
    } else {
      if (!text || !text.trim()) {
        return res.status(400).send({
          message: "Nội dung text không được để trống"
        });
      }

      newMessage = new messageSchema({
        from: from,
        to: to,
        messageContent: {
          type: "text",
          text: text.trim()
        }
      });
    }

    await newMessage.save();

    const result = await messageSchema
      .findById(newMessage._id)
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl");

    return res.status(201).send({
      message: "Gửi message thành công",
      data: result
    });
  } catch (error) {
    return res.status(500).send({
      message: error.message
    });
  }
});

/*
  GET /api/v1/messages?currentUser=...
  Lấy message cuối cùng của mỗi user mà currentUser đã nhắn hoặc được nhắn tới
*/
router.get("/", async function (req, res, next) {
  try {
    const currentUser = req.query.currentUser;

    if (!currentUser) {
      return res.status(400).send({
        message: "Thiếu currentUser"
      });
    }

    const allMessages = await messageSchema
      .find({
        $or: [{ from: currentUser }, { to: currentUser }]
      })
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl")
      .sort({ createdAt: -1 });

    const latestMap = new Map();

    for (const msg of allMessages) {
      const otherUserId =
        String(msg.from._id) === String(currentUser)
          ? String(msg.to._id)
          : String(msg.from._id);

      if (!latestMap.has(otherUserId)) {
        latestMap.set(otherUserId, msg);
      }
    }

    return res.status(200).send(Array.from(latestMap.values()));
  } catch (error) {
    return res.status(500).send({
      message: error.message
    });
  }
});

module.exports = router;