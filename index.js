const TelegramBot = require("node-telegram-bot-api");

const token = "6034132301:AAFsbKhXl5iNdh1ZqGNIUKoM6VTVFP0gvLs";

const express = require("express");
const cors = require("cors");

const bot = new TelegramBot(token, { polling: true });

const webAppUrl = "https://delicate-hamster-4c5ba3.netlify.app/";

const app = express();

app.use(express.json());
app.use(cors());

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (text === "/start") {
    await bot.sendMessage(
      chatId,
      "Чтобы открыть графический интерфейс нажмите на кнопку ниже или нажмите на синюю кнопку Сайт",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Сделать заказ", web_app: { url: webAppUrl } }],
          ],
        },
      }
    );
  }
});

app.post("/pay", async (req, res) => {
  const { queryId, products, delievery, delievery_time, comment } = req.body;

  try {
    const message = `
      Вид доставки: ${delievery},
      Время доставки: ${delievery_time},
      Комментарий: ${comment}
    `;

    await bot.answerWebAppQuery(queryId, {
      type: "article",
      id: queryId,
      title: "Ваш заказ принят",
      input_message_content: {
        message_text: message,
      },
    });

    return res.status(200).json({ message: "Successfull" });
  } catch (error) {
    await bot.answerWebAppQuery(queryId, {
      type: "article",
      id: queryId,
      title: "Не удалось приобрести товар",
      input_message_content: {
        message_text: "Не удалось приобрести товар",
      },
    });
    return res.status(500).json({ message: "Fail" });
  }
});

app.get("/", async (req, res) => {
  console.log("Works great");
  return res.status(200).json({ message: "Success" });
});

const PORT = 8000;

app.listen(PORT, () => console.log("server started on PORT" + PORT));
