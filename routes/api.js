'use strict';

const mongoose = require("mongoose");
const fetch = require("node-fetch");

// Conexión a Mongo UNA sola vez
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Esquema de la base de datos
const stockSchema = new mongoose.Schema({
  stock: { type: String, required: true, unique: true },
  likes: { type: Number, default: 0 },
  ipList: { type: [String], default: [] }   // lista de IPs anonimizadas
});

const Stock = mongoose.model("Stock", stockSchema);

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {

      try {
        const { stock, like } = req.query;

        // Validación básica
        if (!stock) return res.json({ error: "Stock symbol required" });

        // Si viene un solo stock, convertirlo en array
        const stocks = Array.isArray(stock) ? stock : [stock];

        // IP anonimizanda para FCC (solo 2 primeros octetos)
        const ip = req.ip || req.connection.remoteAddress;
        const anonymizedIp = ip.split(".").slice(0, 2).join(".") + ".0.0";

        // Función para consultar el precio en el proxy
        const fetchPrice = async (symbol) => {
          const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
          const response = await fetch(url);
          const data = await response.json();
          return data.latestPrice ? data.latestPrice : null;
        };

        // Procesador de un stock
        const processStock = async (symbol) => {
          let stockDoc = await Stock.findOne({ stock: symbol });

          if (!stockDoc) {
            stockDoc = new Stock({ stock: symbol });
          }

          // Manejo del like
          if (like === "true") {
            if (!stockDoc.ipList.includes(anonymizedIp)) {
              stockDoc.likes += 1;
              stockDoc.ipList.push(anonymizedIp);
            }
          }

          await stockDoc.save();

          const price = await fetchPrice(symbol);

          return {
            stock: symbol.toUpperCase(),
            price,
            likes: stockDoc.likes
          };
        };

        // Procesar todos los stocks (1 o 2)
        const results = await Promise.all(stocks.map(s => processStock(s)));

        // Si es una sola acción → respuesta simple
        if (results.length === 1) {
          const r = results[0];
          return res.json({
            stockData: {
              stock: r.stock,
              price: r.price,
              likes: r.likes
            }
          });
        }

        // Si son dos acciones → agregar rel_likes
        const [s1, s2] = results;

        return res.json({
          stockData: [
            {
              stock: s1.stock,
              price: s1.price,
              rel_likes: s1.likes - s2.likes
            },
            {
              stock: s2.stock,
              price: s2.price,
              rel_likes: s2.likes - s1.likes
            }
          ]
        });

      } catch (err) {
        console.error(err);
        return res.json({ error: "Internal server error" });
      }

    });
};
