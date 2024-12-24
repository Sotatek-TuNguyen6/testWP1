const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { writeToGoogleSheets } = require('./function/writeGGSheet');
const { readFileSync } = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

let submittedData = [];
let isSubmitted = false;
const VERIFICATION_TOKEN = "XuhuEezYQIG6G3F9Aedx1w";
let participants = [];
let roomNameZoom = ""
// io.on('connection', (socket) => {
//     console.log('A client connected:', socket.id);

//     socket.emit('isSubmitted', isSubmitted);

//     socket.on('disconnect', () => {
//         console.log('A client disconnected:', socket.id);
//     });
// });

// app.post("/submit", (req, res) => {
//     const { campaignName, zoomLink1 } = req.body;

//     const formData = { campaignName, zoomLink1 };

//     if (isSubmitted) {
//         return res.status(400).json({
//             message: "Form has already been submitted",
//             submittedData,
//         });
//     }

//     const existingEntryIndex = submittedData.findIndex(
//         (entry) => entry.campaignName === campaignName
//     );

//     if (existingEntryIndex !== -1) {
//         submittedData[existingEntryIndex] = formData;
//     } else {
//         submittedData.push(formData);
//     }

//     isSubmitted = true;

//     io.emit('isSubmitted', isSubmitted);

//     res.json({
//         message: "Form data saved successfully",
//     });
// });

// app.post("/reset", (req, res) => {
//     isSubmitted = false;
//     submittedData = [];

//     io.emit('isSubmitted', isSubmitted);

//     res.json({ message: "Submit status and data reset successfully" });
// });

app.post("/webhook", (req, res) => {
    const { event, payload } = req.body;

    if (event === "endpoint.url_validation") {
        const plainToken = payload.plainToken;
        console.log(plainToken);
        const encryptedToken = crypto
            .createHmac("sha256", VERIFICATION_TOKEN).update(plainToken).digest("hex");
        return res.status(200).json({ plainToken, encryptedToken });
    }
    if (!isSubmitted) {
        return;
    }

    roomNameZoom = payload?.object?.topic

    if (event === "meeting.participant_joined") {
        const participant = payload.object.participant;
        console.log(`User ${participant.user_name} joined the meeting.`);
        const isExisting = participants.some(
            (p) => p.id === participant.id
        );

        if (!isExisting) {
            participants.push({
                id: participant.id,
                user_name: participant.user_name,
                join_time: payload.object.start_time || new Date().toISOString(),
            });
        }
    } else if (event === "meeting.participant_left") {
        const participant = payload.object.participant;
        participants = participants.filter(
            (p) => p.id !== participant.id
        );
        console.log(`User ${participant.user_name} left the meeting.`);
    }
    else if (event === "meeting.ended") {
        console.log("Meeting ended. Clearing participants list...");
        participants = [];
        console.log("Participants list cleared.");
        roomNameZoom = ""
    }
    else {
        console.log(`Unhandled event: ${event}`);
    }

    res.status(200).send("Event received");
});

const writeGGSheet = async () => {
    try {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0'); // Giờ
        const minutes = String(now.getMinutes()).padStart(2, '0'); // Phút
        const day = String(now.getDate()).padStart(2, '0'); // Ngày
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Tháng (bắt đầu từ 0)
        const year = now.getFullYear(); // Năm
        const currentTime = `${hours}:${minutes} - ${day}/${month}/${year}`;
        const view = participants.length;

        const campaignName = roomNameZoom.split("(")[0].trim();
        const zoomName = roomNameZoom.match(/\(([^)]+)\)/)?.[1] || "Unknown";

        const newData = [
            [campaignName, zoomName, currentTime, view]
        ];
        await writeToGoogleSheets(newData);

    } catch (error) {
        console.error('Error:', error);
    }
};

cron.schedule('*/1 * * * *', () => {
    if (roomNameZoom !== "") {
        writeGGSheet();
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
