const supabase = window.supabase.createClient(
    'https://ypfoeackdeyzkmrkytwz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZm9lYWNrZGV5emttcmt5dHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3ODc5OTQsImV4cCI6MjA1ODM2Mzk5NH0.WkCxdRT8sy6n9VH1owcDgnbCJzjgzm5P5OG1h86eRYg'
);

document.addEventListener('DOMContentLoaded', async () => {
    const offlineMessage = document.getElementById('offline-message');
    const tabContent = document.querySelector('.tab-content');

    // Проверка онлайна
    if (!navigator.onLine) {
        offlineMessage.classList.remove('hidden');
        tabContent.classList.add('hidden');
        return;
    }

    // Проверка сессии через куки
    const sessionToken = document.cookie.split('; ')
        .find(row => row.startsWith('session_token='))
        ?.split('=')[1];

    if (!sessionToken) {
        window.location.href = '/login.html';
        return;
    }

    // Проверка в базе по id
    let userData;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, subscription_status, subscription_expiry')
            .eq('id', sessionToken)
            .single();

        if (error || !data) {
            throw error || new Error('No user data');
        }
        userData = data;
        localStorage.setItem('username', userData.username);
    } catch (err) {
        console.error('Error fetching user:', err.message);
        offlineMessage.classList.remove('hidden');
        tabContent.classList.add('hidden');
        document.cookie = 'session_token=; max-age=0; path=/';
        window.location.href = '/login.html';
        return;
    }

    // Заполнение данных
    document.getElementById('username-display').textContent = userData.username;
    document.getElementById('subscription-display').textContent = userData.subscription_status || 'Free Tier';
    document.getElementById('info-username').textContent = userData.username;
    document.getElementById('info-subscription').textContent = userData.subscription_status || 'Free Tier';
    document.getElementById('info-expiry').textContent = userData.subscription_expiry
        ? new Date(userData.subscription_expiry).toLocaleString()
        : 'Never';

    if (userData.subscription_status === 'Sponsor') {
        document.getElementById('sponsor-banner').classList.remove('hidden');
    }

    // Управление вкладками
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    const allowedTabs = {
        'Developer': ['account', 'tools', 'cracks', 'leaks', 'logs'],
        'Premium': ['account', 'tools', 'cracks'],
        'Booster': ['account', 'tools', 'cracks', 'leaks'],
        'Sponsor': ['account', 'tools', 'cracks', 'leaks'],
        'Free Tier': ['account', 'tools']
    };
    const userTabs = allowedTabs[userData.subscription_status] || allowedTabs['Free Tier'];

    function switchTab(tabId) {
        tabs.forEach(tab => tab.classList.remove('active'));
        panes.forEach(pane => {
            pane.classList.remove('active');
            pane.style.opacity = '0';
        });
        const selectedTab = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const selectedPane = document.getElementById(tabId);
        if (selectedTab && selectedPane) {
            selectedTab.classList.add('active');
            selectedPane.classList.add('active');
            setTimeout(() => selectedPane.style.opacity = '1', 50);
        }
    }

    tabs.forEach(tab => {
        const tabId = tab.dataset.tab;
        if (!userTabs.includes(tabId)) {
            tab.disabled = true;
            tab.classList.add('disabled');
        } else {
            tab.addEventListener('click', () => {
                console.log(`Switching to tab: ${tabId}`);
                switchTab(tabId);
            });
        }
    });

    // Открываем Account по умолчанию
    if (userTabs.includes('account')) {
        console.log('Opening Account tab by default');
        switchTab('account');
    }

    // Загрузка Leaks
    async function loadLeaks() {
        const { data, error } = await supabase.from('leaks').select('*');
        const leaksList = document.getElementById('leaks-list');
        leaksList.innerHTML = '';

        if (error) {
            console.error('Error loading leaks:', error.message);
            leaksList.innerHTML = '<p>Error loading leaks.</p>';
            return;
        }
        if (!data || data.length === 0) {
            leaksList.innerHTML = '<p>No leaks available yet.</p>';
            return;
        }

        data.forEach(leak => {
            const leakItem = document.createElement('div');
            leakItem.classList.add('leak-item');
            leakItem.innerHTML = `
                <p>${leak.name}</p>
                <pre>${leak.data}</pre>
            `;
            leaksList.appendChild(leakItem);
        });
    }

    if (userTabs.includes('leaks')) {
        loadLeaks();
        if (userData.subscription_status === 'Developer') {
            document.getElementById('leaks-form').classList.remove('hidden');
            document.getElementById('add-leak-btn').addEventListener('click', async () => {
                const name = document.getElementById('leak-name').value.trim();
                const data = document.getElementById('leak-data').value.trim();

                if (!name || !data) {
                    alert('Please fill in all fields.');
                    return;
                }

                const { error } = await supabase.from('leaks').insert({
                    name,
                    data,
                    created_by: userData.id
                });

                if (error) {
                    console.error('Error adding leak:', error.message);
                    alert('Failed to add leak: ' + error.message);
                } else {
                    document.getElementById('leak-name').value = '';
                    document.getElementById('leak-data').value = '';
                    loadLeaks();
                }
            });
        }
    }

    // Download Buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('disabled')) {
                window.open(btn.dataset.url, '_blank');
            }
        });
    });

    // Logout Button в Account
    document.getElementById('logout-btn').addEventListener('click', () => {
        document.cookie = 'session_token=; max-age=0; path=/';
        localStorage.removeItem('username');
        window.location.href = '/login.html';
    });

    // Logout в навбаре
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        document.cookie = 'session_token=; max-age=0; path=/';
        localStorage.removeItem('username');
        window.location.href = '/login.html';
    });

    // Проверка оффлайн-режима
    window.addEventListener('online', () => {
        offlineMessage.classList.add('hidden');
        tabContent.classList.remove('hidden');
        location.reload();
    });
    window.addEventListener('offline', () => {
        offlineMessage.classList.remove('hidden');
        tabContent.classList.add('hidden');
    });
});
