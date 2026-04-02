let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');

let messageModel = require('../schemas/messages');
let userModel = require('../schemas/users');
let { checkLogin } = require('../utils/authHandler');

router.get('/:userID', checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let userID = req.params.userID;

        if (!mongoose.Types.ObjectId.isValid(userID)) {
            return res.status(400).send({ message: 'userID khong hop le' });
        }

        let result = await messageModel
            .find({
                $or: [
                    { from: currentUserId, to: userID },
                    { from: userID, to: currentUserId }
                ]
            })
            .sort({ createdAt: 1 })
            .populate('from', 'username email avatarUrl')
            .populate('to', 'username email avatarUrl');

        res.send(result);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

router.post('/', checkLogin, async function (req, res, next) {
    try {
        let { to, messageContent } = req.body;

        if (!to || !mongoose.Types.ObjectId.isValid(to)) {
            return res.status(400).send({ message: 'to khong hop le' });
        }

        if (String(to) === String(req.user._id)) {
            return res.status(400).send({ message: 'khong the nhan tin cho chinh minh' });
        }

        if (!messageContent || !messageContent.type || !messageContent.text) {
            return res.status(400).send({ message: 'messageContent khong hop le' });
        }

        if (!['file', 'text'].includes(messageContent.type)) {
            return res.status(400).send({ message: 'type chi nhan file hoac text' });
        }

        if (String(messageContent.text).trim().length === 0) {
            return res.status(400).send({ message: 'text khong duoc rong' });
        }

        let receiver = await userModel.findOne({ _id: to, isDeleted: false });
        if (!receiver) {
            return res.status(404).send({ message: 'nguoi nhan khong ton tai' });
        }

        let newMessage = await messageModel.create({
            from: req.user._id,
            to: to,
            messageContent: {
                type: messageContent.type,
                text: String(messageContent.text).trim()
            }
        });

        let populated = await messageModel
            .findById(newMessage._id)
            .populate('from', 'username email avatarUrl')
            .populate('to', 'username email avatarUrl');

        res.send(populated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

router.get('/', checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id;
        let currentUserObjectId = new mongoose.Types.ObjectId(String(currentUserId));

        let lastMessages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUserObjectId },
                        { to: currentUserObjectId }
                    ]
                }
            },
            {
                $addFields: {
                    partnerUser: {
                        $cond: [
                            { $eq: ['$from', currentUserObjectId] },
                            '$to',
                            '$from'
                        ]
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $group: {
                    _id: '$partnerUser',
                    message: { $first: '$$ROOT' }
                }
            },
            {
                $replaceRoot: {
                    newRoot: '$message'
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);

        let populated = await messageModel.populate(lastMessages, [
            { path: 'from', select: 'username email avatarUrl' },
            { path: 'to', select: 'username email avatarUrl' }
        ]);

        res.send(populated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
