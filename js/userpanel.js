document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
    } else {
        const username = session.user.user_metadata.username || 'User';
        document.getElementById('username-display').textContent = username;
        document.getElementById('info-username').textContent = username;
        await checkSubscription(session.user.id);
    }

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-item');
    const panes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => {
                p.classList.remove('active');
                p.style.opacity = '0';
            });
            tab.classList.add('active');
            const pane = document.getElementById(tab.dataset.tab);
            pane.classList.add('active');
            setTimeout(() => pane.style.opacity = '1', 50);
        });
    });

    // Download Buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('disabled')) {
                window.open(btn.dataset.url, '_blank');
            }
        });
    });

    // Upgrade Button
    document.getElementById('upgrade-btn').addEventListener('click', () => {
        alert('Upgrade functionality coming soon!');
    });

    // Logout Button
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    });
});