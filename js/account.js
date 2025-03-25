const supabase = Supabase.createClient(
    'https://ypfoeackdeyzkmrkytwz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZm9lYWNrZGV5emttcmt5dHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3ODc5OTQsImV4cCI6MjA1ODM2Mzk5NH0.WkCxdRT8sy6n9VH1owcDgnbCJzjgzm5P5OG1h86eRYg'
);

async function checkSubscription(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('subscription_status, subscription_expiry')
        .eq('id', userId)
        .single();

    const statusElement = document.getElementById('subscription-status');
    const expiryElement = document.getElementById('subscription-expiry');
    const zerotissBtn = document.getElementById('zerotiss-download');
    const zeror4tBtn = document.getElementById('zeror4t-download');
    const toolsBtn = document.getElementById('tools-download');

    if (error || !data) {
        console.error('Error fetching subscription:', error);
        statusElement.textContent = 'Free Tier';
        expiryElement.textContent = 'Never';
        zerotissBtn.classList.add('disabled');
        zeror4tBtn.classList.add('disabled');
        toolsBtn.classList.add('disabled');
        return;
    }

    const { subscription_status, subscription_expiry } = data;
    statusElement.textContent = subscription_status || 'Free Tier';
    expiryElement.textContent = subscription_expiry
        ? new Date(subscription_expiry).toLocaleDateString()
        : 'Never';

    const isPremium = subscription_status === 'Premium' && 
        (!subscription_expiry || new Date(subscription_expiry) > new Date());

    if (!isPremium) {
        zerotissBtn.classList.add('disabled');
        zeror4tBtn.classList.add('disabled');
        toolsBtn.classList.add('disabled');
    }
}

window.checkSubscription = checkSubscription;