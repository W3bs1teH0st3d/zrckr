document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase not loaded');
        return;
    }

    const supabase = window.supabase.createClient(
        'https://ypfoeackdeyzkmrkytwz.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZm9lYWNrZGV5emttcmt5dHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3ODc5OTQsImV4cCI6MjA1ODM2Mzk5NH0.WkCxdRT8sy6n9VH1owcDgnbCJzjgzm5P5OG1h86eRYg'
    );

    function sanitizeInput(input) {
        const dangerousChars = /[<>;'"`]/g;
        return !dangerousChars.test(input);
    }

    async function registerUser(username, email, password) {
        if (!sanitizeInput(username) || !sanitizeInput(email) || !sanitizeInput(password)) {
            return { success: false, message: 'Invalid input! Avoid <, >, ;, etc.' };
        }

        // Регистрация через Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } } // Передаём username как метаданные
        });

        if (authError) {
            return { success: false, message: 'Registration failed: ' + authError.message };
        }

        const userId = authData.user.id;

        // Вставка в таблицу users
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: userId, // Связываем с auth.uid()
                username,
                email,
                subscription_status: 'Free Tier',
                subscription_expiry: null
            });

        if (dbError) {
            return { success: false, message: 'Database error: ' + dbError.message };
        }

        document.cookie = `session_token=${userId}; max-age=31536000; path=/`;
        localStorage.setItem('username', username);

        return { success: true, message: 'Registration successful!' };
    }

    async function loginUser(email, password) {
        if (!sanitizeInput(email) || !sanitizeInput(password)) {
            return { success: false, message: 'Invalid input! Avoid <, >, ;, etc.' };
        }

        // Логин через Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            return { success: false, message: 'Login failed: ' + authError.message };
        }

        const userId = authData.user.id;
        const username = authData.user.user_metadata.username;

        document.cookie = `session_token=${userId}; max-age=31536000; path=/`;
        localStorage.setItem('username', username);

        return { success: true, message: 'Login successful!', username };
    }

    window.registerUser = registerUser;
    window.loginUser = loginUser;
    window.supabase = supabase;
});
