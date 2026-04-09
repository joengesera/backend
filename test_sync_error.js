const API_URL = 'http://localhost:3000/api';

async function testSync() {
    try {
        const email = `test_sync_${Date.now()}@example.com`;
        const password = 'Password123!';

        console.log('--- Registering ---');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name: 'Sync Test User',
                password,
                role: 'STUDENT'
            })
        });
        const regData = await regRes.json();
        if (regRes.status !== 201) {
            console.error('Registration failed:', regData);
            return;
        }

        console.log('--- Logging In ---');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (loginRes.status !== 200) {
            console.error('Login failed:', loginData);
            return;
        }

        const token = loginData.data.tokens.accessToken;
        console.log('--- Testing Pull ---');
        const pullRes = await fetch(`${API_URL}/sync/pull?deviceId=test-device`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Pull Status:', pullRes.status);
        const pullData = await pullRes.json();
        console.log('Pull Response:', JSON.stringify(pullData, null, 2));

        console.log('\n--- Testing Push ---');
        const pushRes = await fetch(`${API_URL}/sync/push`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'CREATE',
                entity: 'Task',
                deviceId: 'test-device',
                data: {
                    id: '00000000-0000-4000-a000-000000000001',
                    title: 'Test Task',
                    status: 'TODO'
                }
            })
        });
        console.log('Push Status:', pushRes.status);
        const pushData = await pushRes.json();
        console.log('Push Response:', JSON.stringify(pushData, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testSync();
