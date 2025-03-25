document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.supabase === 'undefined') {
        return;
    }

    const supabase = window.supabase.createClient(
        'https://ypfoeackdeyzkmrkytwz.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZm9lYWNrZGV5emttcmt5dHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3ODc5OTQsImV4cCI6MjA1ODM2Mzk5NH0.WkCxdRT8sy6n9VH1owcDgnbCJzjgzm5P5OG1h86eRYg'
    );

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function sanitizeInput(input) {
        const dangerousChars = /[<>;'"`]/g;
        return !dangerousChars.test(input);
    }

    async function getClientInfo() {
        const userAgent = navigator.userAgent;
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();
        return { ip, userAgent };
    }

    async function registerUser(username, password, password2) {
        if (!sanitizeInput(username) || !sanitizeInput(password) || !sanitizeInput(password2)) {
            return { success: false, message: 'Invalid input! Avoid <, >, ;, etc.' };
        }

        const clientInfo = await getClientInfo();
        const clientHash = await hashPassword(`${clientInfo.ip}-${clientInfo.userAgent}`);

        const { data: existing } = await supabase
            .from('users')
            .select('username')
            .eq('client_hash', clientHash)
            .single();

        if (existing) {
            return { success: false, message: 'This device is already registered with another account.' };
        }

        const { data: usernameCheck } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (usernameCheck) {
            return { success: false, message: 'Username already taken.' };
        }

        const hashedPassword = await hashPassword(password);
        const hashedPassword2 = await hashPassword(password2);

        const { error } = await supabase
            .from('users')
            .insert({
                username,
                password: hashedPassword,
                password2: hashedPassword2,
                subscription_status: 'Free Tier',
                subscription_expiry: null,
                client_hash: clientHash
            });

        if (error) {
            return { success: false, message: 'Registration failed: ' + error.message };
        }

        document.cookie = `session_token=${clientHash}; max-age=31536000; path=/`;
        localStorage.setItem('username', username);

        return { success: true, message: 'Registration successful!' };
    }

    async function loginUser(username, password) {
        if (!sanitizeInput(username) || !sanitizeInput(password)) {
            return { success: false, message: 'Invalid input! Avoid <, >, ;, etc.' };
        }

        const hashedPassword = await hashPassword(password);

        const { data, error } = await supabase
            .from('users')
            .select('username, password, password2, client_hash')
            .eq('username', username)
            .single();

        if (error || !data) {
            return { success: false, message: 'User not found' };
        }

        const isPasswordValid = hashedPassword === data.password;
        const isPassword2Valid = hashedPassword === data.password2;

        if (!isPasswordValid && !isPassword2Valid) {
            return { success: false, message: 'Invalid username or password' };
        }

        document.cookie = `session_token=${data.client_hash}; max-age=31536000; path=/`;
        localStorage.setItem('username', username);

        return { success: true, message: 'Login successful!', username };
    }

    window.registerUser = registerUser;
    window.loginUser = loginUser;
    window.supabase = supabase;
});