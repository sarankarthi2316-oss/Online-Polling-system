// =================== Helper for API calls ===================
async function apiPost(url, data) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

// =================== 1. LOGIN LOGIC ===================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        // Admin Bypass
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'admin' }));
            window.location.replace('admin.html');
            return;
        }

        try {
            const data = await apiPost('/api/login', { username, password });
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.replace('dashboard.html');
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Login Error:", err);
            alert("Server connection failed.");
        }
    });
}

// =================== 2. REGISTER LOGIC ===================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const data = await apiPost('/api/register', { username, email, password });
            if (data.success) {
                alert("Registration Successful!");
                window.location.href = 'index.html'; 
            } else {
                alert("Error: " + data.message);
            }
        } catch (err) {
            alert("Could not connect to server.");
        }
    });
}

// =================== 3. VOTING LOGIC (FIXED) ===================
const voteForm = document.getElementById('voteForm');
if (voteForm) {
    voteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rawData = localStorage.getItem('user');
        if (!rawData) {
            alert("Session expired. Please login again.");
            window.location.href = 'index.html';
            return;
        }
        
        const userData = JSON.parse(rawData);
        const selectedCandidate = document.querySelector('input[name="candidate"]:checked')?.value;

        if (!selectedCandidate) {
            alert("Please select a candidate before submitting!");
            return;
        }

        try {
            const response = await fetch('/api/cast-vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: userData.username, 
                    candidate: selectedCandidate 
                })
            });
            const data = await response.json();

            if (data.success) {
                alert("Vote successful! A confirmation email has been sent.");
                window.location.href = 'dashboard.html';
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Voting error:", err);
            alert("Failed to reach server.");
        }
    });
}

// =================== 4. ADMIN CHARTS LOGIC ===================
async function renderAdminCharts() {
    try {
        const res = await fetch('/api/votes');
        const data = await res.json();
        
        const labels = data.labels;
        const votes = data.votes;

        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Votes',
                data: votes,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)', 
                    'rgba(255, 99, 132, 0.7)', 
                    'rgba(255, 206, 86, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        };

        const options = {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, precision: 0 } }
        };

        // Render Bar Chart
        const barCtx = document.getElementById('barChart');
        if (barCtx) new Chart(barCtx.getContext('2d'), { type: 'bar', data: chartData, options });

        // Render Pie Chart
        const pieCtx = document.getElementById('pieChart');
        if (pieCtx) new Chart(pieCtx.getContext('2d'), { type: 'pie', data: chartData, options: { ...options, scales: {} } });

        // Render Doughnut Chart
        const doughnutCtx = document.getElementById('doughnutChart');
        if (doughnutCtx) new Chart(doughnutCtx.getContext('2d'), { type: 'doughnut', data: chartData, options: { ...options, scales: {} } });

        // Update Winner Stats
        if (votes.length > 0) {
            const maxVotes = Math.max(...votes);
            const winnerIndex = votes.indexOf(maxVotes);
            const total = votes.reduce((a, b) => a + b, 0);

            const leadingEl = document.getElementById('leadingCandidate');
            const totalEl = document.getElementById('totalVotes');

            if (leadingEl) leadingEl.textContent = labels[winnerIndex];
            if (totalEl) totalEl.textContent = total;
        }

    } catch (error) {
        console.error("Error loading charts:", error);
    }
}

// =================== 5. VOTER DETAILS LOGIC ===================
async function loadVoterDetails() {
    const tableBody = document.getElementById('voterTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/voters');
        const voters = await response.json();
        
        tableBody.innerHTML = voters.map(v => `
            <tr>
                <td>${v.username}</td>
                <td>${v.email}</td>
                <td>
                    <span class="status-badge ${v.has_voted ? 'voted' : 'not-voted'}">
                        ${v.has_voted ? 'Voted' : 'Pending'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Voter list error:", err);
    }
}

// =================== 6. DASHBOARD STATUS ===================
async function updateDashboardStatus() {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);

    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${user.username}!`;

    try {
        const response = await fetch(`/api/user-status/${user.username}`);
        const data = await response.json();
        const statusText = document.getElementById('voteStatus');
        const voteBtn = document.getElementById('goVote');

        if (data.has_voted && statusText) {
            statusText.innerText = "Status: Voted Successfully!";
            statusText.style.color = "#4CAF50"; 
            if (voteBtn) voteBtn.style.display = 'none'; 
        }
    } catch (err) { console.error(err); }
}

// =================== 7. INITIALIZATION & LOGOUT ===================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('dashboard.html')) updateDashboardStatus();
    if (path.includes('admin.html')) renderAdminCharts();
    if (path.includes('voter-details.html')) loadVoterDetails();
    if (path.includes('results.html')) renderAdminCharts();
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}