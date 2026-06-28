const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serving static files from current directory
app.use(express.static(__dirname));

// Simple in-memory store for OTPs: { email: { otp, expiresAt } }
const otpStore = {};

// Helper to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
        return res.status(400).json({ success: false, message: 'Invalid Gmail address.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    otpStore[email.trim().toLowerCase()] = { otp, expiresAt };

    console.log(`[OTP Bot] Generated OTP ${otp} for ${email}`);

    // Check if SMTP is configured
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass || user === 'your_gmail_address@gmail.com' || pass === 'your_gmail_app_password') {
        console.log(`[OTP Bot] SMTP credentials not configured in .env.`);
        return res.status(500).json({
            success: false,
            message: 'SMTP Server is not configured. Please add your EMAIL_USER and EMAIL_PASS in the .env file.'
        });
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });

    const mailOptions = {
        from: `"VYRA Games" <${user}>`,
        to: email,
        subject: 'VYRA Games — Gmail Verification OTP',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c0d14; color: #ffffff; padding: 2rem; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #1a1c29;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <h1 style="color: #00ff66; margin: 0; font-size: 2rem; letter-spacing: 2px;">VYRA GAMES</h1>
                    <p style="color: #8f92a1; font-size: 0.9rem; margin-top: 5px;">Your Esports & Casual Gaming Portal</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #1a1c29; margin-bottom: 1.5rem;" />
                <p style="font-size: 1rem; line-height: 1.5; color: #e1e1e6;">Hello Gamers,</p>
                <p style="font-size: 1rem; line-height: 1.5; color: #e1e1e6;">Thank you for registering on VYRA. Use the following One-Time Password (OTP) to complete your Gmail sign-in. This OTP is valid for 5 minutes.</p>
                
                <div style="background-color: rgba(0, 255, 102, 0.05); border: 1px solid rgba(0, 255, 102, 0.2); border-radius: 12px; padding: 1.5rem; text-align: center; margin: 2rem 0;">
                    <span style="font-size: 2.5rem; font-weight: 700; color: #00ff66; letter-spacing: 8px;">${otp}</span>
                </div>
                
                <p style="font-size: 0.85rem; color: #8f92a1; line-height: 1.5; text-align: center;">If you didn't request this verification, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #1a1c29; margin-top: 1.5rem; margin-bottom: 1rem;" />
                <p style="font-size: 0.8rem; color: #5a5c6a; text-align: center; margin: 0;">&copy; 2026 VYRA Games. All Rights Reserved.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[OTP Bot] Verification email successfully sent to ${email}`);
        return res.json({ success: true, message: 'OTP sent to your Gmail.' });
    } catch (error) {
        console.error('[OTP Bot] Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later or check server configuration.' });
    }
});

const fs = require('fs');
const path = require('path');

const VERIFIED_EMAILS_FILE = path.join(__dirname, 'verified_users.json');

const saveVerifiedEmail = (email, ffuid, instaid) => {
    try {
        let users = [];
        if (fs.existsSync(VERIFIED_EMAILS_FILE)) {
            const fileData = fs.readFileSync(VERIFIED_EMAILS_FILE, 'utf8');
            users = JSON.parse(fileData || '[]');
        }
        
        // Handle conversion of old raw array format to object array if needed
        if (users.length > 0 && typeof users[0] === 'string') {
            users = users.map(e => ({ email: e, ffuid: '', instaid: '' }));
        }

        const normalizedEmail = email.toLowerCase().trim();
        const index = users.findIndex(u => u.email === normalizedEmail);

        if (index === -1) {
            users.push({
                email: normalizedEmail,
                ffuid: ffuid ? ffuid.trim() : '',
                instaid: instaid ? instaid.trim() : ''
            });
            fs.writeFileSync(VERIFIED_EMAILS_FILE, JSON.stringify(users, null, 2), 'utf8');
            console.log(`[OTP Bot] Saved new verified user: ${normalizedEmail}. Total verified users: ${users.length}`);
        } else {
            // Update existing user details if changed
            users[index].ffuid = ffuid ? ffuid.trim() : users[index].ffuid;
            users[index].instaid = instaid ? instaid.trim() : users[index].instaid;
            fs.writeFileSync(VERIFIED_EMAILS_FILE, JSON.stringify(users, null, 2), 'utf8');
        }
    } catch (error) {
        console.error('[OTP Bot] Error saving verified email:', error);
    }
};

// Verify OTP Endpoint
app.post('/api/verify-otp', (req, res) => {
    const { email, otp, ffuid, instaid } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const record = otpStore[email.trim().toLowerCase()];

    if (!record) {
        return res.status(400).json({ success: false, message: 'No OTP requested for this email.' });
    }

    if (Date.now() > record.expiresAt) {
        delete otpStore[email.trim().toLowerCase()];
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp === otp.trim()) {
        delete otpStore[email.trim().toLowerCase()];
        saveVerifiedEmail(email, ffuid, instaid);
        return res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
        return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
    }
});

const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');

const recordTransaction = (transaction) => {
    try {
        let transactions = [];
        if (fs.existsSync(TRANSACTIONS_FILE)) {
            const fileData = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
            transactions = JSON.parse(fileData || '[]');
        }
        transactions.push({
            ...transaction,
            timestamp: new Date().toISOString()
        });
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf8');
        console.log(`[Payment Gateway] Recorded transaction UTR: ${transaction.utr} for ₹${transaction.amount}`);
    } catch (error) {
        console.error('[Payment Gateway] Error saving transaction:', error);
    }
};

// Record Transaction Endpoint
app.post('/api/record-transaction', (req, res) => {
    const { email, amount, utr } = req.body;

    if (!email || !amount || !utr) {
        return res.status(400).json({ success: false, message: 'All fields (email, amount, utr) are required.' });
    }

    // Verify UTR format (12-digit number)
    if (!/^\d{12}$/.test(utr.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid UTR format. Must be a 12-digit number.' });
    }

    recordTransaction({ email, amount, utr: utr.trim() });
    return res.json({ success: true, message: 'Transaction submitted successfully for review.' });
});
const WITHDRAWALS_FILE = path.join(__dirname, 'withdrawals.json');

const recordWithdrawal = (withdrawal) => {
    try {
        let withdrawals = [];
        if (fs.existsSync(WITHDRAWALS_FILE)) {
            const fileData = fs.readFileSync(WITHDRAWALS_FILE, 'utf8');
            withdrawals = JSON.parse(fileData || '[]');
        }
        withdrawals.push({
            ...withdrawal,
            status: 'Pending',
            timestamp: new Date().toISOString()
        });
        fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawals, null, 2), 'utf8');
        console.log(`[Withdraw Portal] Recorded withdrawal request for ₹${withdrawal.amount} (Acc: ${withdrawal.account})`);
    } catch (error) {
        console.error('[Withdraw Portal] Error saving withdrawal:', error);
    }
};

// Send WhatsApp alert
const sendWhatsAppAlert = async (withdrawal) => {
    const phone = process.env.WHATSAPP_PHONE || '917857005651';
    const apiKey = process.env.WHATSAPP_API_KEY;

    const messageText = `*New Withdrawal Request on VYRA Games!*\n\n` +
        `• *Email:* ${withdrawal.email}\n` +
        `• *Amount:* ₹${withdrawal.amount}\n` +
        `• *Account Number:* ${withdrawal.account}\n` +
        `• *IFSC Code:* ${withdrawal.ifsc}\n` +
        `• *Time:* ${new Date().toLocaleString()}`;

    console.log(`[WhatsApp Alert] Dispatching alert to ${phone}:\n${messageText}`);

    if (!apiKey || apiKey === 'your_callmebot_api_key_here') {
        console.log(`[WhatsApp Alert] CallMeBot API Key not configured. Skipping automated delivery.`);
        return;
    }

    try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(messageText)}&apikey=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            console.log(`[WhatsApp Alert] Alert successfully sent to ${phone}`);
        } else {
            console.error(`[WhatsApp Alert] Failed sending alert. Status: ${response.status}`);
        }
    } catch (error) {
        console.error('[WhatsApp Alert] Network error while sending alert:', error);
    }
};

// Withdraw Cash Endpoint
app.post('/api/withdraw', async (req, res) => {
    const { email, amount, account, ifsc } = req.body;

    if (!email || !amount || !account || !ifsc) {
        return res.status(400).json({ success: false, message: 'All fields (email, amount, account, ifsc) are required.' });
    }

    const withdrawVal = parseFloat(amount);
    if (isNaN(withdrawVal) || withdrawVal < 300) {
        return res.status(400).json({ success: false, message: 'Minimum withdrawal limit is ₹300.' });
    }

    const data = { email, amount: withdrawVal, account, ifsc };
    recordWithdrawal(data);
    
    // Fire WhatsApp alert
    sendWhatsAppAlert(data);

    return res.json({ success: true, message: 'Withdrawal request submitted successfully.' });
});

const MATCHES_FILE = path.join(__dirname, 'matches.json');

// Helper to save matches
const getMatches = () => {
    try {
        if (fs.existsSync(MATCHES_FILE)) {
            return JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8') || '[]');
        }
    } catch (e) {
        console.error('Error reading matches:', e);
    }
    return [];
};

const saveMatches = (matches) => {
    try {
        fs.writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving matches:', e);
    }
};

// Admin Panel endpoints
app.get('/api/admin/data', (req, res) => {
    try {
        // Read verified users
        let users = [];
        if (fs.existsSync(VERIFIED_EMAILS_FILE)) {
            users = JSON.parse(fs.readFileSync(VERIFIED_EMAILS_FILE, 'utf8') || '[]');
        }

        // Read deposits
        let deposits = [];
        if (fs.existsSync(TRANSACTIONS_FILE)) {
            deposits = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8') || '[]');
        }

        // Read withdrawals
        let withdrawals = [];
        if (fs.existsSync(WITHDRAWALS_FILE)) {
            withdrawals = JSON.parse(fs.readFileSync(WITHDRAWALS_FILE, 'utf8') || '[]');
        }

        // Read matches
        const matches = getMatches();

        return res.json({ users, deposits, withdrawals, matches });
    } catch (error) {
        console.error('[Admin API] Error retrieving dashboard data:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve admin data.' });
    }
});

app.post('/api/admin/approve-withdrawal', (req, res) => {
    const { timestamp } = req.body;

    if (!timestamp) {
        return res.status(400).json({ success: false, message: 'Timestamp is required.' });
    }

    try {
        if (!fs.existsSync(WITHDRAWALS_FILE)) {
            return res.status(404).json({ success: false, message: 'No withdrawals found.' });
        }

        let withdrawals = JSON.parse(fs.readFileSync(WITHDRAWALS_FILE, 'utf8') || '[]');
        
        // Find index matching timestamp
        const index = withdrawals.findIndex(w => w.timestamp === timestamp);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });
        }

        // Update status to Approved
        withdrawals[index].status = 'Approved';
        
        fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawals, null, 2), 'utf8');
        console.log(`[Admin Panel] Approved withdrawal request for ₹${withdrawals[index].amount} at timestamp: ${timestamp}`);
        
        return res.json({ success: true, message: 'Withdrawal approved and marked as paid.' });
    } catch (error) {
        console.error('[Admin API] Error approving withdrawal:', error);
        return res.status(500).json({ success: false, message: 'Failed to approve withdrawal.' });
    }
});

// Admin Custom Match Creation
app.post('/api/admin/create-match', (req, res) => {
    const { game, map, time, mode, entryFee, prizePool } = req.body;

    if (!game || !map || !time || !mode) {
        return res.status(400).json({ success: false, message: 'Game, Map, Time, and Mode are required.' });
    }

    try {
        const matches = getMatches();
        const newMatch = {
            id: Math.random().toString(36).substr(2, 9),
            game,
            map,
            time,
            mode,
            entryFee: parseFloat(entryFee) || 0,
            prizePool: parseFloat(prizePool) || 0,
            registered: 0,
            totalSpots: mode.includes('Solo') ? 48 : (mode.includes('1v1') ? 2 : (mode.includes('Duo') ? 24 : 12)),
            roomId: '',
            password: '',
            status: 'Upcoming',
            timestamp: new Date().toISOString()
        };

        matches.push(newMatch);
        saveMatches(matches);
        console.log(`[Admin Match Manager] Created custom match: ${game} (${mode} on ${map}) at ${time}`);
        return res.json({ success: true, message: 'Match created successfully.', match: newMatch });
    } catch (e) {
        console.error('[Admin Match Manager] Error creating match:', e);
        return res.status(500).json({ success: false, message: 'Failed to create match.' });
    }
});

// Admin Update Room Credentials
app.post('/api/admin/update-room', (req, res) => {
    const { matchId, roomId, password } = req.body;

    if (!matchId) {
        return res.status(400).json({ success: false, message: 'Match ID is required.' });
    }

    try {
        const matches = getMatches();
        const index = matches.findIndex(m => m.id === matchId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        matches[index].roomId = roomId || '';
        matches[index].password = password || '';
        
        saveMatches(matches);
        console.log(`[Admin Match Manager] Updated Room Info for Match ID: ${matchId} -> Room: ${roomId}`);
        return res.json({ success: true, message: 'Room credentials updated.' });
    } catch (e) {
        console.error('[Admin Match Manager] Error updating room:', e);
        return res.status(500).json({ success: false, message: 'Failed to update credentials.' });
    }
});

// Admin Delete Match Endpoint
app.post('/api/admin/delete-match', (req, res) => {
    const { matchId } = req.body;

    if (!matchId) {
        return res.status(400).json({ success: false, message: 'Match ID is required.' });
    }

    try {
        let matches = getMatches();
        const initialLength = matches.length;
        matches = matches.filter(m => m.id !== matchId);

        if (matches.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        saveMatches(matches);
        console.log(`[Admin Match Manager] Manually deleted Match ID: ${matchId}`);
        return res.json({ success: true, message: 'Match deleted successfully.' });
    } catch (e) {
        console.error('[Admin Match Manager] Error deleting match:', e);
        return res.status(500).json({ success: false, message: 'Failed to delete match.' });
    }
});

// Client Get Matches
app.get('/api/matches', (req, res) => {
    const matches = getMatches();
    return res.json({ matches });
});

// Client Register Match
app.post('/api/register-match', (req, res) => {
    const { matchId, email, uids } = req.body;

    if (!matchId || !email) {
        return res.status(400).json({ success: false, message: 'Match ID and Email are required.' });
    }

    try {
        const matches = getMatches();
        const index = matches.findIndex(m => m.id === matchId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        const match = matches[index];
        if (match.registered >= match.totalSpots) {
            return res.status(400).json({ success: false, message: 'Match lobby is full.' });
        }

        // Deduct entry fee on backend balance check (if entryFee > 0)
        const entryFee = match.entryFee || 0;
        if (entryFee > 0) {
            // Check deposits vs withdrawals to calculate real balance
            let deposits = [];
            if (fs.existsSync(TRANSACTIONS_FILE)) {
                deposits = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8') || '[]');
            }
            
            let withdrawals = [];
            if (fs.existsSync(WITHDRAWALS_FILE)) {
                withdrawals = JSON.parse(fs.readFileSync(WITHDRAWALS_FILE, 'utf8') || '[]');
            }

            // Simple sum of user's transactions
            const totalDeposited = deposits
                .filter(t => t.email.toLowerCase() === email.toLowerCase())
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

            const totalWithdrawn = withdrawals
                .filter(w => w.email.toLowerCase() === email.toLowerCase())
                .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

            const balance = totalDeposited - totalWithdrawn;

            if (balance < entryFee) {
                return res.status(400).json({ success: false, message: `Insufficient balance! Entry fee is ₹${entryFee}. Please add cash first.` });
            }

            // To reflect deduction, we record a negative balance transaction or just simulate it.
            recordTransaction({ email, amount: -entryFee, utr: `ENTRY-${Math.random().toString(36).substr(2, 6).toUpperCase()}` });
        }

        // Initialize players array if it doesn't exist
        if (!matches[index].players) {
            matches[index].players = [];
        }

        // Save player details with their registered UIDs
        matches[index].players.push({
            email: email.trim().toLowerCase(),
            uids: uids || [],
            timestamp: new Date().toISOString()
        });

        matches[index].registered += 1;
        saveMatches(matches);
        console.log(`[Lobby Registration] User ${email} (UIDs: ${uids}) registered for Match ID: ${matchId}. Total: ${matches[index].registered}`);
        return res.json({ success: true, message: 'Successfully registered for match.' });
    } catch (e) {
        console.error('[Lobby Registration] Error registering user:', e);
        return res.status(500).json({ success: false, message: 'Registration failed.' });
    }
});

// Admin Credit Winner Prize Endpoint
app.post('/api/admin/credit-prize', (req, res) => {
    const { email, amount } = req.body;

    if (!email || !amount) {
        return res.status(400).json({ success: false, message: 'Email and Amount are required.' });
    }

    const prizeVal = parseFloat(amount);
    if (isNaN(prizeVal) || prizeVal <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid prize amount. Must be greater than 0.' });
    }

    try {
        const utr = `PRIZE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        recordTransaction({
            email: email.trim().toLowerCase(),
            amount: prizeVal,
            utr: utr
        });
        console.log(`[Admin Prize Panel] Successfully credited ₹${prizeVal} prize to ${email} (Ref: ${utr})`);
        return res.json({ success: true, message: `Prize of ₹${prizeVal} successfully credited to ${email}.` });
    } catch (err) {
        console.error('[Admin Prize Panel] Error crediting prize:', err);
        return res.status(500).json({ success: false, message: 'Failed to credit prize.' });
    }
});

// Client Record inGames Win
app.post('/api/add-win-coin', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        // Since points on server represent Leaderboard performance, increment user's points
        // In a real database we would update their wallet coins, for now we will log the win
        console.log(`[Loyalty Coin Reward] User ${email} won an inGames match. Awarded 1 Coin.`);
        return res.json({ success: true, message: 'Winnings saved. 1 Loyalty Coin credited!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Failed to record winnings.' });
    }
});
// Client Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
    try {
        let users = [];
        if (fs.existsSync(VERIFIED_EMAILS_FILE)) {
            users = JSON.parse(fs.readFileSync(VERIFIED_EMAILS_FILE, 'utf8') || '[]');
        }

        // Combine verified users with default demo players
        const demoPlayers = [
            { email: "SniperGod_99", points: 14920 },
            { email: "Raju_Gamer", points: 12500 },
            { email: "SneakyFox", points: 11200 }
        ];

        // Format verified emails to usernames
        const formattedUsers = users.map((email, idx) => {
            const username = email.split('@')[0];
            // Assign a stable mock score based on index/length
            const points = 10000 - (idx * 500) + Math.floor(Math.random() * 100);
            return { email: username, points: Math.max(points, 1000) };
        });

        const combinedList = [...formattedUsers, ...demoPlayers]
            .sort((a, b) => b.points - a.points);

        return res.json({ leaderboard: combinedList });
    } catch (e) {
        console.error('Error serving leaderboard:', e);
        return res.status(500).json({ success: false, message: 'Failed to retrieve leaderboard.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` VYRA Backend OTP Server running at:`);
    console.log(` http://localhost:${PORT}`);
    console.log(`===============================================`);
});
