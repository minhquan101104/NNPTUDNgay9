var express = require("express");
var router = express.Router();
let { validatedResult, CreateUserValidator, ModifyUserValidator } = require("../utils/validator")
let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let userController = require("../controllers/users");
const { checkLogin, checkRole } = require("../utils/authHandler");
const { sendAccountPasswordMail } = require("../utils/mailHandler");
let XLSX = require("xlsx");
let fs = require("fs");
let path = require("path");
let crypto = require("crypto");

const DEFAULT_IMPORT_FILE_PATH = "/Users/chautandat/DoAn/user.xlsx";
const PASSWORD_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

function buildRandomPassword(length) {
  let targetLength = length || 16;
  let password = "";
  while (password.length < targetLength) {
    let randomIndex = crypto.randomInt(0, PASSWORD_CHARSET.length);
    password += PASSWORD_CHARSET[randomIndex];
  }
  return password;
}

function normalizeImportRow(row) {
  let mappedRow = {};
  Object.keys(row).forEach(function (key) {
    mappedRow[String(key).trim().toLowerCase()] = row[key];
  });

  let username = mappedRow.username ? String(mappedRow.username).trim() : "";
  let email = mappedRow.email ? String(mappedRow.email).trim().toLowerCase() : "";
  return { username, email };
}


router.get("/", checkLogin, checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  let users = await userModel
    .find({ isDeleted: false })
  res.send(users);
});

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/import-excel", checkLogin, checkRole("ADMIN", "MODERATOR", "admin_demo"), async function (req, res, next) {
  try {
    let rawFilePath = req.body.filePath || DEFAULT_IMPORT_FILE_PATH;
    let importFilePath = path.resolve(rawFilePath);

    if (!fs.existsSync(importFilePath)) {
      return res.status(404).send({ message: "Khong tim thay file import", filePath: importFilePath });
    }

    let workbook = XLSX.readFile(importFilePath);
    if (workbook.SheetNames.length === 0) {
      return res.status(400).send({ message: "File excel khong co sheet du lieu" });
    }

    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let importedRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (importedRows.length === 0) {
      return res.status(400).send({ message: "File excel khong co dong du lieu" });
    }

    let userRole = await roleModel.findOne({ name: /^user$/i, isDeleted: false });
    if (!userRole) {
      userRole = await roleModel.create({
        name: "user",
        description: "Default role for imported users"
      });
    }

    let result = {
      filePath: importFilePath,
      totalRows: importedRows.length,
      created: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    for (let i = 0; i < importedRows.length; i++) {
      let rowNumber = i + 2;
      let rowData = normalizeImportRow(importedRows[i]);
      if (!rowData.username || !rowData.email) {
        result.skipped++;
        result.details.push({
          row: rowNumber,
          status: "skipped",
          message: "Thieu username hoac email"
        });
        continue;
      }

      let existedUser = await userModel.findOne({
        $or: [{ username: rowData.username }, { email: rowData.email }],
        isDeleted: false
      });
      if (existedUser) {
        result.skipped++;
        result.details.push({
          row: rowNumber,
          username: rowData.username,
          email: rowData.email,
          status: "skipped",
          message: "Username hoac email da ton tai"
        });
        continue;
      }

      let randomPassword = buildRandomPassword(16);
      try {
        let newUser = await userController.CreateAnUser(
          rowData.username,
          randomPassword,
          rowData.email,
          userRole._id
        );
        result.created++;
        try {
          await sendAccountPasswordMail(newUser.email, newUser.username, randomPassword);
          result.details.push({
            row: rowNumber,
            username: newUser.username,
            email: newUser.email,
            status: "created"
          });
        } catch (mailError) {
          result.details.push({
            row: rowNumber,
            username: newUser.username,
            email: newUser.email,
            status: "created_mail_failed",
            message: mailError.message
          });
        }
      } catch (createError) {
        result.failed++;
        result.details.push({
          row: rowNumber,
          username: rowData.username,
          email: rowData.email,
          status: "failed",
          message: createError.message
        });
      }
    }
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.post("/", CreateUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newUser = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email,
      req.body.role, req.body.fullname, req.body.avatarUrl
    )
    res.send(newUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", ModifyUserValidator, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
