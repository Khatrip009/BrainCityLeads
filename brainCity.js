(function() {
    const SUPABASE_URL = 'https://mskbwsxezirjvobgxifj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_bUpP1gAD01_HJbibWQgjpA_bgfMuvTY';
    const TABLE_NAME = 'inquiries';
    const THANK_YOU_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkOcg4xEUdkyGJVLuG4OQ2E9ga2UMEPqNFFkJZSbAJHAvChHJvv1HEpRdihxMmu1qQYQ/exec?token=BRAINCITY_2025_X9kL3mN7pQrT5vYz';

    const form = document.getElementById('leadForm');
    const submitBtn = document.getElementById('submitBtn');
    const dobInput = document.getElementById('date_of_birth');
    const ageDisplay = document.getElementById('age_display');
    const ageHidden = document.getElementById('age_hidden');
    const inquiryForHidden = document.getElementById('inquiry_for');
    const programOptions = document.querySelectorAll('.program-option');

    function setActiveProgram(value) {
        programOptions.forEach(opt => opt.classList.toggle('selected', opt.getAttribute('data-value') === value));
        inquiryForHidden.value = value;
    }
    programOptions.forEach(opt => opt.addEventListener('click', () => setActiveProgram(opt.getAttribute('data-value'))));
    setActiveProgram('BrainCity: Brain Gym Full Course (Age 4-7)');

    function computeAge(dobStr) {
        if (!dobStr) return null;
        const birth = new Date(dobStr);
        if (isNaN(birth)) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
        return (age >= 0 && age <= 100) ? age : null;
    }
    function updateAgeField() {
        const dob = dobInput.value;
        if (dob) {
            const age = computeAge(dob);
            ageDisplay.value = age !== null ? `${age} years` : 'Invalid';
            ageHidden.value = age !== null ? age : '';
        } else { ageDisplay.value = ''; ageHidden.value = ''; }
    }
    dobInput.addEventListener('change', updateAgeField);

    function showFeedback(msg, type, targetId = 'formFeedback') {
        const container = document.getElementById(targetId);
        if (container) {
            container.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
            setTimeout(() => container.firstChild && container.removeChild(container.firstChild), 6000);
        }
    }

    async function sendAdminNotification(leadData) {
        const emailContent = `New Lead from BrainCity Abacus:\nProgram: ${leadData.inquiry_for}\nStudent: ${leadData.student_name}\nParent: ${leadData.parent_name}\nContact: ${leadData.contact_number}\nEmail: ${leadData.email || 'Not provided'}\nAge: ${leadData.age || 'N/A'}\nSchool: ${leadData.school_name || 'N/A'}\nSource: ${leadData.source_of_inquiry}\nMessage: ${leadData.message || '---'}`;
        const payload = JSON.stringify({ type: "admin", subject: `🔔 New Lead: ${leadData.inquiry_for} - ${leadData.student_name}`, body: emailContent });
        try {
            await fetch(THANK_YOU_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: payload });
            console.log('Admin notification sent.');
        } catch(e) { console.warn('Admin error:', e); }
    }

    async function sendThankYouEmail(leadData) {
        if (!leadData.email) return;
        const payload = JSON.stringify([{ email: leadData.email, student_name: leadData.student_name, parent_name: leadData.parent_name, program: leadData.inquiry_for }]);
        try {
            await fetch(THANK_YOU_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: payload });
            console.log('Thank-you email sent.');
        } catch(e) { console.warn('Thank-you error:', e); }
    }

    async function sendConfirmationAndNotify(leadData) {
        showFeedback(`🎉 Thank you ${leadData.student_name}! Your inquiry for "${leadData.inquiry_for}" is received. We'll contact you shortly.`, 'success');
        sendAdminNotification(leadData);
        sendThankYouEmail(leadData);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = 'Processing...';

        const student_name = document.getElementById('student_name').value.trim();
        const parent_name = document.getElementById('parent_name').value.trim();
        const contact_number = document.getElementById('contact_number').value.trim();
        if (!student_name || !parent_name || !contact_number) {
            showFeedback('❌ Student name, parent name and contact number are required.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Submit & Get Confirmation →';
            return;
        }

        let age = ageHidden.value ? parseInt(ageHidden.value) : null;
        const date_of_birth = dobInput.value || null;
        if (date_of_birth && age === null) age = computeAge(date_of_birth);

        const leadData = {
            student_name, parent_name, date_of_birth, age,
            school_name: document.getElementById('school_name').value.trim() || null,
            standard: document.getElementById('standard').value.trim() || null,
            contact_number,
            email: document.getElementById('email').value.trim() || null,
            whatsapp_number: document.getElementById('whatsapp_number').value.trim() || null,
            whatsapp_consent: document.getElementById('whatsapp_consent').checked,
            inquiry_for: inquiryForHidden.value,
            source_of_inquiry: document.getElementById('source_of_inquiry').value,
            message: document.getElementById('message').value.trim() || null,
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                body: JSON.stringify(leadData)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Supabase error:', errorText);
                throw new Error(`Supabase error ${response.status}`);
            }

            await sendConfirmationAndNotify(leadData);
            form.reset();
            ageDisplay.value = ''; ageHidden.value = ''; dobInput.value = '';
            document.getElementById('whatsapp_consent').checked = false;
            setActiveProgram('BrainCity: Brain Gym Full Course (Age 4-7)');
            ['student_name','parent_name','school_name','standard','contact_number','email','whatsapp_number','message'].forEach(id => document.getElementById(id).value = '');
        } catch (err) {
            showFeedback(`❌ Submission failed: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Submit & Get Confirmation →';
        }
    });

    const adminBtn = document.createElement('button');
    adminBtn.innerHTML = '🔐';
    adminBtn.className = 'floating-admin';
    adminBtn.title = 'Admin Login';
    adminBtn.onclick = () => window.location.href = 'login.html';
    document.body.appendChild(adminBtn);
})();
