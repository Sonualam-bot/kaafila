import express from "express";

const app = express();
const port = process.env.AUTH_PORT || 3001;


app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
})



app.listen(port, () => {
    console.log(`Server is listening to port http://localhost:${port}`)
})