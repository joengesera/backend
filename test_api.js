const API_URL = 'http://localhost:3000/api';

async function test() {
    try {
        console.log('--- Testing Health ---');
        const healthRes = await fetch(`${API_URL}/health`);
        const healthData = await healthRes.json();
        console.log('Health:', healthData);

        const email = `test_${Date.now()}@example.com`;
        const password = 'Password123!';

        console.log('\n--- Testing Registration ---');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name: 'Test User',
                password,
                role: 'STUDENT'
            })
        });
        const regData = await regRes.json();
        console.log('Registration Status:', regRes.status);
        console.log('Registration Data:', JSON.stringify(regData, null, 2));

        console.log('\n--- Testing Login ---');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        if (loginRes.status === 200) {
            console.log('Login Success:', loginData.success);
            const tokens = loginData.data.tokens;
            
            console.log('\n--- Testing Refresh Token ---');
            const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: tokens.refreshToken })
            });
            const refreshData = await refreshRes.json();
            console.log('Refresh Status:', refreshRes.status);
            console.log('Refresh Success:', refreshData.success);
        } else {
            console.log('Login Failed:', loginData);
        }

    } catch (error) {
        console.error('\n!!! Test failed !!!');
        console.error(error.message);
    }
}

test();
