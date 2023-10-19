'use strict';
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './server/storage');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + Date.now() + ext);
    },
});

const upload = multer({ storage: storage });

module.exports = function (Statemdrmeeting) {
    Statemdrmeeting.state_mdr_meeting = function (req, res) {
        upload.single('meeting_minutes')(req, res, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const StateMdrmeetingColl = Statemdrmeeting.app.models.state - mdr - meeting;
            StateMdrmeetingColl.create({
                date,
                attendees,
                meeting_photos: req.file.filename,
                meeting_minutes: req.file.filename
            }, function (err, stateMdrmeeting) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'success', stateMdrmeeting });
            });
        });
    };

    Statemdrmeeting.remoteMethod('state_mdr_meeting', {
        accepts: [
            { arg: 'req', type: 'object', http: { source: 'req' } }
        ],
        returns: {
            root: true,
            type: "object",
        },
        http: { verb: 'post', path: '/state_mdr_meeting' }
    });
};