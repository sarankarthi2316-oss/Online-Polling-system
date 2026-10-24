const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'admin') {
    alert('Access denied! Admins only.');
    window.location.href = '../index.html';
}

async function renderCharts() {
    try {
        const response = await fetch('/api/votes'); 
        const data = await response.json(); 
        
        const labels = data.labels;
        const voteCounts = data.votes;

        const chartConfig = (ctx, type, label) => new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: voteCounts,
                    backgroundColor: ['rgba(75,192,192,0.6)', 'rgba(255,99,132,0.6)', 'rgba(255,206,86,0.6)'],
                    borderWidth: 1
                }]
            },
            options: { scales: type === 'bar' ? { y: { beginAtZero: true, precision: 0 } } : {} }
        });

        if(document.getElementById('barChart')) chartConfig(document.getElementById('barChart').getContext('2d'), 'bar', 'Vote Count');
        if(document.getElementById('pieChart')) chartConfig(document.getElementById('pieChart').getContext('2d'), 'pie', 'Vote Share');
        if(document.getElementById('doughnutChart')) chartConfig(document.getElementById('doughnutChart').getContext('2d'), 'doughnut', 'Vote Distribution');

    } catch (error) {
        console.error("Error loading admin charts:", error);
    }
}

renderCharts();

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}