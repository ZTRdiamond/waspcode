import "./colors.js";
import "./config.js";
import { makeWASocket, DisconnectReason, useMultiFileAuthState, makeInMemoryStore } from "baileys";
import { Boom } from "@hapi/boom";
import Pino from "pino";
import { format } from "util";

const store = makeInMemoryStore({ logger: Pino({ level: "fatal" }).child({ level: "fatal" }) })

async function start() {
  try {
    const auth = await useMultiFileAuthState("session");
    const client = makeWASocket({
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      auth: auth.state,
      logger: Pino({ level: "fatal" }).child({ level: "fatal" })
    });
    
    setTimeout(async function() {
      const target = global.target;
      const code = await client.requestPairingCode(target);
      console.log("[WASPCODE]".main, "Pairing code obtained:".warn, code.info);
      if(code) return process.send("reset")
    }, 10000);
    
    client.ev.on("creds.update", auth.saveCreds);
    client.ev.on("connection.update", async(update) => {
      const {
        lastDisconnect,
        connection,
        qr
      } = update;
  
      if(connection) console.log("[WASPCODE]".main, "Starting request pairing...".warn);
      if(connection == "close") {
        const closeReason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if(closeReason == DisconnectReason.badSession) {
          console.log("[WASPCODE]".main, "Bad session file, Please delete old session and login again.".warn);
        } else if(closeReason == DisconnectReason.connectionClosed) {
          console.log("[WASPCODE]".main, "Connection closed, Reconnecting again...".warn);
          await start()
        } else if(closeReason == DisconnectReason.connectionLost) {
          console.log("[WASPCODE]".main, "Connection lost from server, Reconnecting again...".warn);
          await start()
        } else if(closeReason == DisconnectReason.connectionReplaced) {
          console.log("[WASPCODE]".main, "Connection replaced, Please turn off another running session to start this session.".warn);
        } else if(closeReason == DisconnectReason.loggedOut) {
          console.log("[WASPCODE]".main, "Connection logged out, Please login again and run.".warn);
        } else if(closeReason == DisconnectReason.restartRequired) {
          console.log("[WASPCODE]".main, "Connection closed, Restart requiring. Reconnecting again...".warn);
          await start()
        } else if(closeReason == DisconnectReason.connectionTimedOut) {
          console.log("[WASPCODE]".main, "Connection timeout, Reconnecting again...".warn);
          await start()
        } else if(closeReason == DisconnectReason.multideviceMismatch) {
          console.log("[WASPCODE]".main, "Connection closed, Multi device mismatch. Please login again and run.".warn);
        } else {
          console.log("[WASPCODE]".main, "Connection opened...".warn);
          process.send("opened")
        }
      }
      
      if(connection == "open") {
        console.log("[WASPCODE]".main, "Client connected on:".warn, client?.user?.id.split(":")[0].info);
        process.send("reset")
      }
    });
  } catch (e) {
    console.log(e);
  }
}

start()