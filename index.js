const { PrismaClient } = require("@prisma/client");
const TelegramBot = require("node-telegram-bot-api");

const token = "6034132301:AAFsbKhXl5iNdh1ZqGNIUKoM6VTVFP0gvLs";

const prisma = new PrismaClient();
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
    console.log(chatId);
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

  if (text === "/register_admin") {
    try {
      const alreadyExist = await prisma.admin.findUnique({
        where: {
          chatId: chatId.toString(),
        },
      });
      if (alreadyExist) {
        bot.sendMessage(chatId, "Вы уже являетесь администратором");
        return;
      }

      await prisma.admin.create({
        data: { chatId: chatId.toString() },
      });

      bot.sendMessage(
        chatId,
        "Вы зарегистрированы как администратор. Вы будете получать сообщение про новые заказы!"
      );
    } catch (error) {
      console.log(error.message);
      bot.sendMessage(
        chatId,
        "Не получилось зарегистрировать вас как администратора, попробуйте позже"
      );
    }
  }

  if (text === "/delete_admin") {
    try {
      await prisma.admin.delete({
        where: {
          chatId: chatId.toString(),
        },
      });

      bot.sendMessage(
        chatId,
        "Вы удалены как администратор из наших баз данных"
      );
    } catch (error) {
      console.log(error.message);
      bot.sendMessage(chatId, "Не получилось удалить вас как администратора");
    }
  }
});

app.post("/pay", async (req, res) => {
  const { queryId, products, delievery, delievery_time, comment, price } =
    req.body;

  const getProductTitles = (products) => {
    const titles = products.map((product) => product.title);
    return titles.join(", ");
  };

  try {
    const message = `
Вид доставки: ${delievery},
Время доставки: ${delievery_time},
Комментарий: ${comment},
Сумма заказа: ${price},
Продукты: ${getProductTitles(products)}
    `;

    const admins = await prisma.admin.findMany();
    const chatIds = admins.map((admin) => admin.chatId);

    chatIds.forEach((chatId) => {
      bot.sendMessage(
        chatId,
        `<b>Новый заказ!</b>
Продукты: ${getProductTitles(products)}
Время доставки: ${delievery_time}
Вид доставки: ${delievery}
Комментарий клиента: ${comment}
      `,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Завершить заказ",
                  callback_data: `complete_order_${queryId}`,
                },
              ],
            ],
          },
        }
      );
    });

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
    console.log(error.message);
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

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  try {
    if (data.startsWith("complete_order")) {
      const orderId = data.split("_")[1];

      await bot.answerWebAppQuery(orderId, {
        type: "article",
        id: orderId,
        title: "Ваш заказ завершен",
        input_message_content: {
          message_text: "Ваш заказ завершен. Спасибо за покупку!",
        },
      });

      await bot.sendMessage(chatId, "Заказ завершен!", {
        parse_mode: "HTML",
      });
    }
  } catch (error) {
    console.log(error.message);
    await bot.sendMessage(chatId, "Что то пошло не так!");
  }
});

app.get("/", async (req, res) => {
  console.log("Works great");
  return res.status(200).json({ message: "Success" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("server started on PORT" + PORT));
