const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'scores.json');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Initialize Data File
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Helpers
const getScores = () => {
    try {
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

const saveScores = (scores) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
};

// Routes
app.get('/api/leaderboard', (req, res) => {
    const scores = getScores();
    // Sort logic: Higher score first
    scores.sort((a, b) => b.score - a.score);
    // Return Top 10
    res.json(scores.slice(0, 10));
});

app.post('/api/score', (req, res) => {
    const { name, score, skin } = req.body;

    if (!name || score === undefined) {
        return res.status(400).json({ error: "Missing name or score" });
    }

    const scores = getScores();

    // Add new score
    scores.push({
        name: name.substring(0, 15), // Limit name length
        score: parseInt(score),
        skin: skin || null, // Base64 string allowed
        date: new Date().toISOString()
    });

    // Sort and trimmed to keep file size managed (Top 100 Storage)
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 100);

    saveScores(topScores);

    // Return the updated Top 10 immediately
    res.json(topScores.slice(0, 10));
});

// Start Server
app.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(`  LEADERBOARD SERVER running on PORT ${PORT}`);
    console.log(`  API: http://localhost:${PORT}/api/leaderboard`);
    console.log('--------------------------------------------------');
});
