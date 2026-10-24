const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// =================== SQL CONNECTION ===================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password*123', 
    database: 'polling_system'
});

db.connect(err => {
    if (err) { 
        console.error('Database connection failed: ' + err.stack); 
        return; 
    }
    console.log('Connected to MySQL Database.');
});

// =================== EMAIL CONFIGURATION ===================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ideaboss1030@gmail.com',  
        pass: 'srpwegagaudrpxqo'        
    }
});

// =================== ROUTES ===================

// Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        return res.json({ success: true, user: { username: 'admin', role: 'admin' } });
    }
    db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (results && results.length > 0) {
            res.json({ success: true, user: { username: results[0].username, role: results[0].role || 'user' } });
        } else {
            res.json({ success: false, message: "Invalid credentials!" });
        }
    });
});

// Register Route
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    db.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, password], (err) => {
        if (err) return res.json({ success: false, message: "User already exists or DB error!" });
        res.json({ success: true });
    });
});

// Voter List
app.get('/api/voters', (req, res) => {
    const query = "SELECT username, email, has_voted FROM users WHERE role != 'admin'";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json(results);
    });
});

// Chart Results
app.get('/api/votes', (req, res) => {
    db.query("SELECT name, votes FROM candidates", (err, results) => {
        if (err) return res.status(500).send(err);
        const labels = results.map(r => r.name);
        const votes = results.map(r => r.votes);
        res.json({ labels, votes });
    });
});

// User Status check
app.get('/api/user-status/:username', (req, res) => {
    db.query("SELECT has_voted FROM users WHERE username = ?", [req.params.username], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "User not found" });
        res.json({ has_voted: !!results[0].has_voted }); 
    });
});

// FINAL VOTING LOGIC WITH EMAIL
app.post('/api/cast-vote', (req, res) => {
    const { username, candidate } = req.body;
    console.log(`--- Vote attempt started for: ${username} ---`);

    // 1. Get user email and check if they've voted
    db.query("SELECT email, has_voted FROM users WHERE username = ?", [username], (err, results) => {
        if (err) {
            console.error("DB Error (Select):", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        if (results.length === 0) {
            console.log("User not found in database.");
            return res.status(404).json({ message: "User not found" });
        }
        
        const userEmail = results[0].email;
        console.log(`User email found: ${userEmail}`);

        if (results[0].has_voted) {
            console.log("User has already voted. Stopping.");
            return res.json({ success: false, message: "You have already voted!" });
        }

        // 2. Update candidate count
        db.query("UPDATE candidates SET votes = votes + 1 WHERE name = ?", [candidate], (err) => {
            if (err) {
                console.error("DB Error (Update Candidate):", err);
                return res.status(500).json({ success: false });
            }

            // 3. Mark user as voted
            db.query("UPDATE users SET has_voted = 1 WHERE username = ?", [username], (err) => {
                if (err) {
                    console.error("DB Error (Update User):", err);
                    return res.status(500).json({ success: false });
                }

                console.log("Database updated. Preparing to send email...");

                // 4. Send Confirmation Email
                const mailOptions = {
                    from: 'ideaboss1030@gmail.com',
                    to: userEmail,
                    subject: 'Vote Confirmation - Online Polling System',
                    html: `<h2>Success!</h2>
                           <p>Hello <b>${username}</b>,</p>
                           <p>Your vote for <b>${candidate}</b> has been successfully recorded.</p>
                           <p>Thank you for participating!</p>`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log("!!! Nodemailer Error:", error);
                    } else {
                        console.log(">>> Email sent successfully: " + info.response);
                    }
                });

                // Send response to browser
                res.json({ success: true, message: "Vote cast successfully! Check your email." });
            });
        });
    });
});

// SINGLE LISTENER
app.listen(3000, () => {
    console.log('==========================================');
    console.log('Server running: http://localhost:3000');
    console.log('==========================================');
});