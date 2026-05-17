(function() {
    // ═══════════ CONFIGURATION ═══════════
    const SUPABASE_URL = 'https://mskbwsxezirjvobgxifj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_bUpP1gAD01_HJbibWQgjpA_bgfMuvTY';
    const TABLE_NAME = 'inquiries';
    const THANK_YOU_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkOcg4xEUdkyGJVLuG4OQ2E9ga2UMEPqNFFkJZSbAJHAvChHJvv1HEpRdihxMmu1qQYQ/exec?token=BRAINCITY_2025_X9kL3mN7pQrT5vYz';

    // ═══════════ DOM REFERENCES ═══════════
    const form = document.getElementById('leadForm');
    const submitBtn = document.getElementById('submitBtn');
    const dobInput = document.getElementById('date_of_birth');
    const ageDisplay = document.getElementById('age_display');
    const ageHidden = document.getElementById('age_hidden');
    const inquiryForHidden = document.getElementById('inquiry_for');
    const programOptions = document.querySelectorAll('.program-option');

    // ═══════════ PROGRAM SELECTION ═══════════
    function setActiveProgram(value) {
        programOptions.forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
        });
        inquiryForHidden.value = value;
    }

    programOptions.forEach(opt => {
        opt.addEventListener('click', () => setActiveProgram(opt.getAttribute('data-value')));
    });
    setActiveProgram('BrainCity: Brain Gym Full Course (Age 4-7)');

    // ═══════════ AGE CALCULATION ═══════════
    function computeAge(dobStr) {
        if (!dobStr) return null;
        const birth = new Date(dobStr);
        if (isNaN(birth)) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
            age--;
        }
        return (age >= 0 && age <= 100) ? age : null;
    }

    function updateAgeField() {
        const dob = dobInput.value;
        if (dob) {
            const age = computeAge(dob);
            ageDisplay.value = age !== null ? `${age} years` : 'Invalid';
            ageHidden.value = age !== null ? age : '';
        } else {
            ageDisplay.value = '';
            ageHidden.value = '';
        }
    }
    dobInput.addEventListener('change', updateAgeField);

    // ═══════════ FEEDBACK ═══════════
    function showFeedback(msg, type, targetId = 'formFeedback') {
        const container = document.getElementById(targetId);
        if (container) {
            container.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
            setTimeout(() => {
                if (container.firstChild) container.removeChild(container.firstChild);
            }, 6000);
        }
    }

    // ═══════════ ADMIN NOTIFICATION (no-cors fetch) ═══════════
    async function sendAdminNotification(leadData) {
        const emailContent = `
New Lead from BrainCity Abacus:
Program: ${leadData.inquiry_for}
Student: ${leadData.student_name}
Parent: ${leadData.parent_name}
Contact: ${leadData.contact_number}
Email: ${leadData.email || 'Not provided'}
Age: ${leadData.age || 'N/A'}
School: ${leadData.school_name || 'N/A'}
Source: ${leadData.source_of_inquiry}
Message: ${leadData.message || '---'}
        `;

        const payload = JSON.stringify({
            type: "admin",
            subject: `🔔 New Lead: ${leadData.inquiry_for} - ${leadData.student_name}`,
            body: emailContent
        });

        try {
            await fetch(THANK_YOU_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: payload
            });
            console.log('Admin notification sent.');
        } catch (e) {
            console.warn('Admin notification failed:', e);
        }
    }

    // ═══════════ THANK‑YOU EMAIL (no-cors fetch) ═══════════
    async function sendThankYouEmail(leadData) {
        if (!leadData.email) return;

        const payload = JSON.stringify([{
            email: leadData.email,
            student_name: leadData.student_name,
            parent_name: leadData.parent_name,
            program: leadData.inquiry_for
        }]);

        try {
            await fetch(THANK_YOU_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: payload
            });
            console.log('Thank-you email sent.');
        } catch (e) {
            console.warn('Thank-you email failed:', e);
        }
    }

    async function sendConfirmationAndNotify(leadData) {
        showFeedback(
            `🎉 Thank you ${leadData.student_name}! Your inquiry for "${leadData.inquiry_for}" is received. We'll contact you shortly.`,
            'success',
            'formFeedback'
        );
        sendAdminNotification(leadData);
        sendThankYouEmail(leadData);
    }

    // ═══════════ FORM SUBMISSION (sendBeacon for Supabase) ═══════════
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = 'Processing...';

        const student_name = document.getElementById('student_name').value.trim();
        const parent_name = document.getElementById('parent_name').value.trim();
        const contact_number = document.getElementById('contact_number').value.trim();

        if (!student_name || !parent_name || !contact_number) {
            showFeedback('❌ Student name, parent name and contact number are required.', 'error', 'formFeedback');
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Submit & Get Confirmation →';
            return;
        }

        let age = ageHidden.value ? parseInt(ageHidden.value) : null;
        const date_of_birth = dobInput.value || null;
        if (date_of_birth && age === null) age = computeAge(date_of_birth);

        const leadData = {
            student_name,
            parent_name,
            date_of_birth,
            age,
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

        // ── Use sendBeacon to bypass all blockers ──
        const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?apikey=${SUPABASE_ANON_KEY}`;
        const blob = new Blob([JSON.stringify(leadData)], { type: 'application/json' });
        const beaconSent = navigator.sendBeacon(url, blob);

        if (!beaconSent) {
            showFeedback('❌ Submission blocked. Please try again.', 'error', 'formFeedback');
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Submit & Get Confirmation →';
            return;
        }

        // Since sendBeacon is fire-and-forget, we assume success.
        await sendConfirmationAndNotify(leadData);

        // Reset form
        form.reset();
        ageDisplay.value = '';
        ageHidden.value = '';
        dobInput.value = '';
        document.getElementById('whatsapp_consent').checked = false;
        setActiveProgram('BrainCity: Brain Gym Full Course (Age 4-7)');
        document.getElementById('student_name').value = '';
        document.getElementById('parent_name').value = '';
        document.getElementById('school_name').value = '';
        document.getElementById('standard').value = '';
        document.getElementById('contact_number').value = '';
        document.getElementById('email').value = '';
        document.getElementById('whatsapp_number').value = '';
        document.getElementById('message').value = '';

        submitBtn.disabled = false;
        submitBtn.innerText = '🚀 Submit & Get Confirmation →';
    });

    // ═══════════ FLOATING ADMIN BUTTON ═══════════
    const adminBtn = document.createElement('button');
    adminBtn.innerHTML = '🔐';
    adminBtn.className = 'floating-admin';
    adminBtn.title = 'Admin Login';
    adminBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
    document.body.appendChild(adminBtn);
})();
