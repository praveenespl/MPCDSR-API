'use strict';

module.exports = function(Mdsrform3) {
  Mdsrform3.sendEmail = async function(options) {
        try {
            await sendMail(options);
            return { status: 'Mail Sent Successfully' };
        } catch (error) {
            return error;
        }

    };

    Mdsrform3.remoteMethod('sendEmail', {
        description: 'send mail form 3 line listing to every month of 5',
        accepts: [{
            arg: 'options',
            type: 'object'
        }],
        returns: {
            root: true,
            type: 'object',
            require: true,
            http: {
                "source": "body"
            }
        },
        http: {
            verb: 'post'
        }
    })
};
