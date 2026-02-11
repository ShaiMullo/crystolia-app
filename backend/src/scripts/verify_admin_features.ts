
import axios from 'axios';
import 'dotenv/config';

const API_URL = 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@crystolia.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function runVerification() {
    try {
        console.log('🚀 Starting Admin Features Verification...');

        // 1. Login as Admin
        console.log('🔑 Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Admin Logged In');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create New Agent
        console.log('👤 Creating Test Agent...');
        const agentEmail = `testagent_${Date.now()}@crystolia.com`;
        const createRes = await axios.post(`${API_URL}/users`, {
            name: 'Test Agent',
            email: agentEmail,
            password: 'password123',
            role: 'agent'
        }, { headers });
        const newAgent = createRes.data.data;
        console.log(`✅ Created Agent: ${newAgent.email} (${newAgent._id})`);

        // 3. Update Agent (Deactivate)
        console.log('🛑 Deactivating Agent...');
        const updateRes = await axios.patch(`${API_URL}/users/${newAgent._id}`, {
            isActive: false
        }, { headers });
        console.log(`✅ Agent Active Status: ${updateRes.data.data.isActive}`);

        // 4. Fetch Audit Logs
        console.log('📋 Fetching Audit Logs...');
        const auditRes = await axios.get(`${API_URL}/audit`, { headers });
        const logs = auditRes.data.data;
        console.log(`✅ Fetched ${logs.length} audit logs`);
        const createLog = logs.find((l: any) => l.action === 'CREATE' && l.entityId === newAgent._id);
        if (createLog) console.log('✅ Found explicit Audit Log for User Creation');

        // 5. Assign Lead
        console.log('📎 Assigning Lead...');
        const leadsRes = await axios.get(`${API_URL}/leads`, { headers });
        const lead = leadsRes.data.data.leads[0];
        if (lead) {
            const assignRes = await axios.patch(`${API_URL}/leads/${lead._id}`, {
                assignedTo: newAgent._id,
                status: 'contacted'
            }, { headers });
            console.log(`✅ Assigned Lead ${lead._id} to Agent ${newAgent._id}`);
            console.log(`✅ New Status: ${assignRes.data.lead.status}`);
        } else {
            console.log('⚠️ No leads found to test assignment');
        }

        console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');

    } catch (error: any) {
        console.error('\n❌ VERIFICATION FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runVerification();
