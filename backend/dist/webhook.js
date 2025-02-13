"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./utils/logger");
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const certifcate = fs_1.default.readFileSync(process.env.SSL_CRT, "utf8");
const privatekey = fs_1.default.readFileSync(process.env.SSL_KEY, "utf8");
const credentials = { key: privatekey, cert: certifcate };
const app = (0, express_1.default)();
app.use(express_1.default.json());
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;
app.post("/webhook", async (req, res) => {
    // log incoming messages
    console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));
    // check if the webhook request contains a message
    // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
    // check if the incoming message contains text
    if (message?.type === "text") {
        // extract the business number to send the reply from it
        const business_phone_number_id = req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
        // send a reply message as per the docs here https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
        await (0, axios_1.default)({
            method: "POST",
            url: `https://graph.facebook.com/v21.0/${business_phone_number_id}/messages`,
            headers: {
                Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            },
            data: {
                messaging_product: "whatsapp",
                to: message.from,
                text: { body: "Echo: " + message.text.body },
                context: {
                    message_id: message.id, // shows the message as a reply to the original user message
                },
            },
        });
        // mark incoming message as read
        await (0, axios_1.default)({
            method: "POST",
            url: `https://graph.facebook.com/v21.0/${business_phone_number_id}/messages`,
            headers: {
                Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            },
            data: {
                messaging_product: "whatsapp",
                status: "read",
                message_id: message.id,
            },
        });
    }
    res.sendStatus(200);
});
// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    // check the mode and token sent are correct
    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        // respond with 200 OK and challenge token from the request
        res.status(200).send(challenge);
        console.log("Webhook verified successfully!");
    }
    else {
        // respond with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
    }
});
app.get("/", (req, res) => {
    res.send(`<pre>Nothing to see here. Checkout README.md to start.</pre>`);
});
/*
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
*/
const server = https_1.default.createServer(credentials, app);
server.listen(82, async () => {
    logger_1.logger.info(`Server started on port: 82`);
});
