const supabase = window.supabase.createClient(
    'https://ypfoeackdeyzkmrkytwz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZm9lYWNrZGV5emttcmt5dHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3ODc5OTQsImV4cCI6MjA1ODM2Mzk5NH0.WkCxdRT8sy6n9VH1owcDgnbCJzjgzm5P5OG1h86eRYg'
);

document.addEventListener('DOMContentLoaded', async () => {
    const offlineMessage = document.getElementById('offline-message');
    const tabContent = document.querySelector('.tab-content');

    if (!navigator.onLine) {
        offlineMessage.classList.remove('hidden');
        tabContent.classList.add('hidden');
        return;
    }

    // Проверка сессии Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        console.error('No active session:', sessionError?.message);
        window.location.href = '/login.html';
        return;
    }

    const sessionToken = session.user.id; // Используем ID пользователя из сессии

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
        await supabase.auth.signOut();
        window.location.href = '/login.html';
        return;
    }

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

    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    const allowedTabs = {
        'Developer': ['account', 'tools', 'cracks', 'leaks', 'special', 'logs'],
        'Premium': ['account', 'tools', 'cracks'],
        'Booster': ['account', 'tools', 'cracks', 'leaks'],
        'Sponsor': ['account', 'tools', 'cracks', 'leaks', 'special'],
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

    if (userTabs.includes('account')) {
        console.log('Opening Account tab by default');
        switchTab('account');
    }

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

    async function loadSpecialContent() {
        const { data, error } = await supabase.from('special').select('*');
        const specialList = document.getElementById('special-list');
        specialList.innerHTML = '';

        if (error) {
            console.error('Error loading special content:', error.message);
            specialList.innerHTML = '<p>Error loading special content.</p>';
            return;
        }
        if (!data || data.length === 0) {
            specialList.innerHTML = '<p>No special content available yet.</p>';
            return;
        }

        data.forEach(item => {
            const specialItem = document.createElement('div');
            specialItem.classList.add('special-item');
            specialItem.innerHTML = `
                <p>${item.name}</p>
                <img src="${item.image_url}" alt="${item.name}">
            `;
            specialList.appendChild(specialItem);
        });
    }

    if (userTabs.includes('special')) {
        loadSpecialContent();
        if (userData.subscription_status === 'Developer') {
            document.getElementById('special-form').classList.remove('hidden');
            
            const specialImageBtn = document.getElementById('special-image-btn');
            if (specialImageBtn) {
                specialImageBtn.addEventListener('click', () => {
                    document.getElementById('special-image').click();
                });
            }

            document.getElementById('add-special-btn').addEventListener('click', async () => {
                const name = document.getElementById('special-name').value.trim();
                const fileInput = document.getElementById('special-image');
                const file = fileInput.files[0];

                if (!name || !file) {
                    alert('Please fill in all fields and select an image.');
                    return;
                }

                const { data: fileData, error: uploadError } = await supabase.storage
                    .from('special-images')
                    .upload(`${Date.now()}-${file.name}`, file);

                if (uploadError) {
                    console.error('Error uploading image:', uploadError.message);
                    alert('Failed to upload image: ' + uploadError.message);
                    return;
                }

                const imageUrl = supabase.storage.from('special-images').getPublicUrl(fileData.path).data.publicUrl;

                const { error } = await supabase.from('special').insert({
                    name,
                    image_url: imageUrl,
                    created_by: userData.id
                });

                if (error) {
                    console.error('Error adding special:', error.message);
                    alert('Failed to add special: ' + error.message);
                } else {
                    document.getElementById('special-name').value = '';
                    fileInput.value = '';
                    loadSpecialContent();
                }
            });
        }
    }

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('disabled')) {
                window.open(btn.dataset.url, '_blank');
            }
        });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        document.cookie = 'session_token=; max-age=0; path=/';
        localStorage.removeItem('username');
        supabase.auth.signOut();
        window.location.href = '/login.html';
    });

    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        document.cookie = 'session_token=; max-age=0; path=/';
        localStorage.removeItem('username');
        supabase.auth.signOut();
        window.location.href = '/login.html';
    });

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
