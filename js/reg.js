document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase not loaded');
        return;
    }

    const supabase = window.supabase.createClient(
        'https://ypfoeackdeyzkmrkytwz.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZm9lYWNrZGV5emttcmt5dHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3ODc5OTQsImV4cCI6MjA1ODM2Mzk5NH0.WkCxdRT8sy6n9VH1owcDgnbCJzjgzm5P5OG1h86eRYg'
    );

    // Функция получения IP клиента
    async function getClientIp() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Failed to fetch IP:', error);
            return null; // Если IP не удалось получить, продолжаем без строгой блокировки
        }
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data1 = encoder.encode(password);
        const hash1 = await crypto.subtle.digest('SHA-256', data1);
        const hash1Hex = Array.from(new Uint8Array(hash1))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const data2 = encoder.encode(hash1Hex);
        const hash2 = await crypto.subtle.digest('SHA-256', data2);
        return Array.from(new Uint8Array(hash2))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function sanitizeInput(input) {
        const dangerousChars = /[<>;'"`]/g;
        return !dangerousChars.test(input);
    }

    async function registerUser(username, email, password) {
        if (!sanitizeInput(username) || !sanitizeInput(email) || !sanitizeInput(password)) {
            return { success: false, message: 'Invalid input! Avoid <, >, ;, etc.' };
        }

        // Получаем IP клиента
        const clientIp = await getClientIp();
        if (clientIp) { // Проверяем IP только если он получен
            const { data: ipCheck, error: ipError } = await supabase
                .from('ip_addresses')
                .select('ip_address')
                .eq('ip_address', clientIp)
                .single();

            if (ipError && ipError.code !== 'PGRST116') {
                console.error('IP check failed:', ipError.message);
                // Не блокируем, если проверка IP сломалась, чтобы не ломать регистрацию
            } else if (ipCheck) {
                return { success: false, message: 'Only one account per IP is allowed!' };
            }
        }

        const doubleHashedPassword = await hashPassword(password);

        // Проверяем уникальность username
        const { data: usernameCheck, error: usernameError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (usernameError && usernameError.code !== 'PGRST116') {
            return { success: false, message: 'Error checking username: ' + usernameError.message };
        }
        if (usernameCheck) {
            return { success: false, message: 'Username already taken' };
        }

        // Проверяем уникальность email
        const { data: emailCheck, error: emailError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (emailError && emailError.code !== 'PGRST116') {
            return { success: false, message: 'Error checking email: ' + emailError.message };
        }
        if (emailCheck) {
            return { success: false, message: 'Email already registered' };
        }

        // Генерируем свой ID
        const userId = crypto.randomUUID();

        // Вставка в таблицу users
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: userId,
                username,
                email,
                password: doubleHashedPassword,
                subscription_status: 'Free Tier',
                subscription_expiry: null
            });

        if (dbError) {
            return { success: false, message: 'Database error: ' + dbError.message };
        }

        // Вставка IP в таблицу ip_addresses, если IP получен
        if (clientIp) {
            const { error: ipInsertError } = await supabase
                .from('ip_addresses')
                .insert({
                    ip_address: clientIp,
                    user_id: userId
                });

            if (ipInsertError) {
                console.error('Failed to save IP:', ipInsertError.message);
                // Не прерываем регистрацию, если IP не сохранился
            }
        }

        // Сохраняем сессию вручную
        document.cookie = `session_token=${userId}; max-age=31536000; path=/`;
        localStorage.setItem('username', username);

        return { success: true, message: 'Registration successful!' };
    }

    async function loginUser(login, password) {
        if (!sanitizeInput(login) || !sanitizeInput(password)) {
            return { success: false, message: 'Invalid input! Avoid <, >, ;, etc.' };
        }

        const doubleHashedPassword = await hashPassword(password);

        // Проверяем по username или email
        const { data, error } = await supabase
            .from('users')
            .select('id, username, email, password')
            .or(`username.eq.${login},email.eq.${login}`)
            .single();

        if (error || !data) {
            return { success: false, message: 'User not found' };
        }

        if (doubleHashedPassword !== data.password) {
            return { success: false, message: 'Invalid password' };
        }

        // Сохраняем сессию вручную
        document.cookie = `session_token=${data.id}; max-age=31536000; path=/`;
        localStorage.setItem('username', data.username);

        return { success: true, message: 'Login successful!', username: data.username };
    }

    window.registerUser = registerUser;
    window.loginUser = loginUser;
    window.supabase = supabase;
});
