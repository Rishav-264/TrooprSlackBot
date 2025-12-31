require('dotenv').config({path: __dirname + '/.env'});
const express = require("express");
const eventsApi = require('@slack/events-api');
const { WebClient, LogLevel } = require("@slack/web-api");

const app = express();
const PORT = process.env.PORT || 3000;

//YOUR CODE HERE

const token = process.env.BOT_TOKEN;
const slackEvents = eventsApi.createEventAdapter(process.env.SIGNING_SECRET);
const client = new WebClient(token, {
   logLevel: LogLevel.DEBUG
});
app.use('/bot/slack/events', slackEvents.expressMiddleware());
slackEvents.on("message", async(event) => {
   if(!event.subtype && !event.bot_id){
    const payload = {
    fields: {
      project: {
        key: process.env.JIRA_PROJECT_KEY,
      },
      summary: event?.text,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                text: event?.text || "N/A",
                type: "text",
              },
            ],
          },
        ],
      },
      issuetype: {
        name: "Task",
      },
      priority: {
        name: "Low",
      },
    },
  };

  fetch(`${process.env.JIRA_URL}/rest/api/3/issue`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${Buffer.from(
      `${process.env.JIRA_EMAIL}:${process.env.JIRA_ACCESS_TOKEN}`
    ).toString('base64')}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => {
    console.log(
      `Response: ${response.status} ${response.statusText}`
    );
    return response.text();
  })
  .then(text => console.log(text))
  .catch(err => console.error(err));
  client.chat.postMessage({
           token,
           channel: event.channel,
           thread_ts: event.ts,
           text: "Hello World!"
       })
   }
   })


app.post(
  "/jira/webhook",
  express.json(),
  async (req, res) => {
    // We only care about issue creation
    const issue = req.body.issue;
      console.log("🎫 Jira issue created!");
      console.log("Key:", issue.key);
      console.log("Summary:", issue.fields.summary);
      console.log(
        "Created by:",
        issue.fields.creator?.displayName
      );
      const issueUrl = `${process.env.JIRA_URL}/browse/${issue.key}`;
      try {
        await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL_ID,
          text: `🎫 *New Jira Issue Created*\n*${issue.key}*: ${issue.fields.summary}\n👤 Created by: ${issue.fields.creator?.displayName}\n🔗 ${issueUrl}`
        });
      } catch (err) {
        console.error("Slack message failed:", err);
      }
    // Always respond 200 quickly
    res.sendStatus(200);
  }
);



app.listen(PORT, () => {
   console.log(`App listening at http://localhost:${PORT}`)
})
