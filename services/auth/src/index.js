import express from "express";
import {query} from "./db.js"

const app = express();
const port = process.env.AUTH_PORT || 3001;

async function checkDbConnection(){
    try {
        await query("SELECT 1");
        console.log("DB Connection ok")
    } catch (error) {
        console.error("DB Connection FAILED: ", error.message)
        process.exit(1)
        
    }
}

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
})


await checkDbConnection();
app.listen(port, () => {
    console.log(`Server is listening to port http://localhost:${port}`)
})