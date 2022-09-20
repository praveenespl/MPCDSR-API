var moment = require('moment');
module.exports = function(Model, bootOptions = {}) {
    // Model is the model class
    // bootOptions is an object containing the config properties from model definition

    const options = Object.assign({
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        required: true,
        validateUpsert: true, // default to turning validation on
        silenceWarnings: false,
    }, bootOptions);

    Model.defineProperty(options.createdAt, {
        type: Date,
        required: options.required,
        default: new Date(moment.utc()) //'now' new Date()
    });

    Model.defineProperty(options.updatedAt, {
        type: Date,
        required: options.required,
    });

    Model.observe('before save', (ctx, next) => {
        if (ctx.options && ctx.options.skipModified) {
            return next();
        }
        if (ctx.instance) {
            ctx.instance[options.updatedAt] = new Date(moment.utc());
        } else {
            ctx.data[options.updatedAt] = new Date(moment.utc());
        }
        return next();
    });
}
