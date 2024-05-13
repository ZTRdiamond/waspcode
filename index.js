import "./colors.js";
import {
  spawn
} from "child_process"
import fs from "fs";
import * as path from 'path'
import {
  fileURLToPath
} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.on('uncaughtException', console.error)

function start() {
  let args = [path.join(__dirname, '/waspcode.js'), ...process.argv.slice(2)]
  let session = spawn(process.argv[0], args, {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })
    .on('message', async data => {
      if (data == 'reset') {
        console.log("[WASPCODE]".main, 'Restarting after success requesting code...'.warn, "\n-------------------------------------")
        await fs.unlinkSync(path.join(__dirname, "./session/creds.json"));
        session.kill(0)
        start()
      } else if(data == "opened") {
        console.log("[WASPCODE]".main, "Restarting waspcode because connection is openned...".warn, "\n-------------------------------------")
        await fs.unlinkSync(path.join(__dirname, "./session/creds.json"));
        session.kill(0)
        start()
      }
    })
    .on('exit', code => {
      console.error('Exited with code:'.danger, (code || "NaN").info)
      if (code == "." || code == 1 || code == 0) start()
    })
}
start()