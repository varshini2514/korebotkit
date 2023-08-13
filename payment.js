var botId = "st-614d084b-3f02-5ce5-8410-e9f3ca5a156c";
var botName = "Insurance Lead Booster_plg.support@kore.com_1";
var sdk = require("./lib/sdk");
var _ = require('lodash');
var config = require("./config");
var path  = require("path");
const stripe = require('stripe')('sk_test_51HToqZKRFQR6bIVdufTuXrn7tnc9jfh4QrwvqVZZf2Ena7SJsYk4231A3DTMcJ5B7NgbpdmTt1h4AjJnIFPSU1RY009Ktd0EUn');

function chargeCustomer(req, res) {
    return stripe.customers.create({
        name: req.body.name,
        email: req.body.email,
        source: req.body.stripeToken,
        address: {
            line1: 'Ft 101 DSNR',
            postal_code: '32825',
            city: 'Orlando',
            state: 'Florida',
            country: 'US',
        }
    }).then(customer => stripe.charges.create({
        amount: req.body.amount * 100,
        currency: "USD",
        customer: customer.id,
        description: req.body.description
    })).then((result) => {
        //res.redirect(config.app.url + config.app.apiPrefix + "/korePaymentGateway/completed.html?requestId=" + req.body.requestId);
        res.render("views/genericBotkit/korePaymentGateway/completed.html");
        return result.id;
    });
}

module.exports = {
    botId: botId,
    botName: botName,

    on_user_message: function (requestId, data, callback) {
        console.log("U msg : ",data.message);
        if (!data.agent_transfer) {
            //Forward the message to bot
            return sdk.sendBotMessage(data, callback);
        } else {
            data.message = "Agent Message";
            return sdk.sendUserMessage(data, callback);
        }
    },
    on_bot_message: function (requestId, data, callback) {
        console.log("B Msg : ",data.message);
        //suppress UiForm submission message
        if(data && data.message && data.message.indexOf("is successfully submitted")>-1){
            console.log("Skipping form message");
            return sdk.skipUserMessage(data);
        }

        return sdk.sendUserMessage(data, callback);
    },
    on_webhook: function (requestId, data, componentName, callback) {
        var context = data.context;
        //should be used if want callback of payment status....
        if (componentName === 'sendPaymentLink') {
            sdk.saveData(requestId, data).then(() => {
                    var link = config.app.url + config.app.apiPrefix + "/korePaymentGateway/index.html?requestId=" + requestId + "&topupType=" + context.entities.choosePlan;
                    data.message = "Follow the [link](" + link + ") to proceed with the payment";
                    console.log(link);
                    return sdk.sendUserMessage(data)
                }).then(function () {
                    callback(null, new sdk.AsyncResponse()); //send 202 resp
                })
                .catch((err) => {
                    console.error("Error in wee : ", err.message);
                    sdk.respondToHook(data);
                });
        }
    },
    respondToHook: function (req, res) {
        //should be used if want callback of payment status....
        var paymentResult = chargeCustomer(req, res);
        sdk.getSavedData(req.body.requestId).then(function(_data){
            if(_data){
                var data =_data;
                sdk.respondToHook(data).then(function(){
                    paymentResult.then(function(result){
                        if(result)
                            data.message= 'Your payment is successfull ' ;
                        sdk.sendUserMessage(data);
                    });
                })
            }
        });
    }
};
