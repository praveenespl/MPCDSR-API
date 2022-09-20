'use strict';
const {sendMail2} = require('../../shared/send-mail');
const { sendSMS } = require("../../shared/send-sms")
module.exports = function(Alert) {
    Alert.sendEmailAndMessage = async function(parameters){
        try {
          const options = {
			from: 'support@etech-services.com',
			to: parameters.email,
			text: parameters.message.email.subject,
			subject: parameters.message.email.subject,
			html : parameters.message.email.body
		}
    let url = parameters.message.sms.url.replace("<mob>", (parameters.mobile.toString()));
    url = url.replace("<msg>", parameters.message.sms.message);
    console.log(parameters);

          await sendMail2(options);
          await sendSMS(url);
          return {status:'Mail Sent Successfully'};
        } catch (error) {
          return error;
        }
    
      };
    
      Alert.remoteMethod('sendEmailAndMessage',{
        description: 'Send email and Messages',
        accepts: [{
          arg:'parameters',
          type:'object'
        }],
        returns: {
          root: true,
          type:'object',
          require: true,
          http: {
              "source": "body"
          }
        },
        http:{
          verb: 'post'
        }
      })
};
