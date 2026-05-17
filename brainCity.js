(function() {
    // ═══════════ CONFIGURATION ═══════════
    const SUPABASE_URL = 'https://mskbwsxezirjvobgxifj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_bUpP1gAD01_HJbibWQgjpA_bgfMuvTY';
    const TABLE_NAME = 'inquiries';

    // Your deployed Google Apps Script URL (unchanged)
    const THANK_YOU_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkOcg4xEUdkyGJVLuG4OQ2E9ga2UMEPqNFFkJZSbAJHAvChHJvv1HEpRdihxMmu1qQYQ/exec?token=BRAINCITY_2025_X9kL3mN7pQrT5vYz';

    // ═══════════ INIT SUPABASE ═══════════
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
            if (opt.getAttribute('data-value') === value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        inquiryForHidden.value = value;
    }

    programOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const val = opt.getAttribute('data-value');
            setActiveProgram(val);
        });
    });

    setActiveProgram('BrainCity: Brain Gym Full Course (Age 4-7)');

    // ═══════════ AGE CALCULATION ═══════════
    function computeAge(dobStr) {
        if (!dobStr) return null;
        const birth = new Date(dobStr);
        if (isNaN(birth)) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return (age >= 0 && age <= 100) ? age : null;
    }

    function updateAgeField() {
        const dob = dobInput.value;
        if (dob) {
            const age = computeAge(dob);
            if (age !== null) {
                ageDisplay.value = `${age} years`;
                ageHidden.value = age;
            } else {
                ageDisplay.value = 'Invalid';
                ageHidden.value = '';
            }
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

    // ═══════════ ADMIN NOTIFICATION ═══════════
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

        try {
            await fetch('https://formsubmit.co/ajax/khatrip.009@gmail.com', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    name: leadData.parent_name,
                    email: leadData.email || 'no-email@lead.com',
                    message: emailContent,
                    _subject: `🔔 New Lead: ${leadData.inquiry_for} - ${leadData.student_name}`
                })
            });
        } catch (e) {
            console.warn('Admin email optional error:', e);
        }
    }

    // ═══════════ THANK‑YOU EMAIL (iframe – no CORS) ═══════════
    async function sendThankYouEmail(leadData) {
        if (!leadData.email) return;

        const form = document.createElement('form');
        form.method = 'POST';
        form.target = 'hiddenFrame';
        form.action = THANK_YOU_SCRIPT_URL;
        form.style.display = 'none';

        const payload = JSON.stringify([{
            email: leadData.email,
            student_name: leadData.student_name,
            parent_name: leadData.parent_name,
            program: leadData.inquiry_for
        }]);

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'payload';
        input.value = payload;
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        console.log('Thank-you email request sent via iframe.');
    }

    async function sendConfirmationAndNotify(leadData) {
        showFeedback(
            `🎉 Thank you ${leadData.student_name}! Your inquiry for "${leadData.inquiry_for}" is received. We'll contact you shortly.`,
            'success', 'formFeedback'
        );
        sendAdminNotification(leadData);
        sendThankYouEmail(leadData);
    }

    // ═══════════ FORM SUBMISSION ═══════════
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

        const payload = {
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

        try {
            const { error } = await supabase.from(TABLE_NAME).insert([payload]);
            if (error) throw error;
            await sendConfirmationAndNotify(payload);
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
        } catch (err) {
            showFeedback(`❌ Submission failed: ${err.message || 'Network error'}`, 'error', 'formFeedback');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Submit & Get Confirmation →';
        }
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
