document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[PWA] Service Worker registered successfully', reg.scope))
                .catch(err => console.error('[PWA] Service worker registration failed:', err));
        });
    }

    // --- Wallet Transactions Logic ---
    let currentBalance = parseFloat(localStorage.getItem('walletBalance')) || 0.00;

    // Credit 10 Coins to user's initial wallet state
    if (localStorage.getItem('userCoins') === null) {
        localStorage.setItem('userCoins', '10');
    }

    const updateWalletUI = () => {
        localStorage.setItem('walletBalance', currentBalance.toString());
        const cashElements = document.querySelectorAll('.currency.cash');
        cashElements.forEach(el => {
            // Keep the wallet icon and update the text balance
            el.innerHTML = `<i class="fa-solid fa-wallet"></i> ₹${currentBalance.toFixed(2)} <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; margin-left: 4px;"></i>`;
        });
        const withdrawBalanceEl = document.getElementById('availableWithdrawBalance');
        if (withdrawBalanceEl) {
            withdrawBalanceEl.innerText = currentBalance.toFixed(2);
        }

        // Dynamically update Coins count in the navbar (1 coin is equal to 1 points / local tracker)
        const coinCountEl = document.getElementById('navCoinCount');
        if (coinCountEl) {
            // Retrieve or mock user coins counter
            let userCoins = parseInt(localStorage.getItem('userCoins')) || 0;
            coinCountEl.innerText = `${userCoins} Coins`;
        }
        setupDropdownEvents();
    };

    // Toggle Dropdown on Click & Hover
    const setupDropdownEvents = () => {
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            const btn = dropdown.querySelector('.dropbtn');
            const content = dropdown.querySelector('.dropdown-content');
            if (btn && content) {
                // Remove existing listeners
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                newBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isDisplayed = content.style.display === 'block';
                    // Close all other dropdowns
                    document.querySelectorAll('.dropdown-content').forEach(c => c.style.display = 'none');
                    content.style.display = isDisplayed ? 'none' : 'block';
                });
            }
        });
    };

    // Close dropdowns on clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-content').forEach(c => c.style.display = 'none');
    });

    // Run initial dropdown bindings and set wallet balance
    setupDropdownEvents();
    updateWalletUI();

    // Modals References
    const addCashModal = document.getElementById('addCashModal');
    const withdrawCashModal = document.getElementById('withdrawCashModal');

    // Show Modals
    const addCashBtns = document.querySelectorAll('#addCashBtn');
    addCashBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (addCashModal) {
                addCashModal.style.display = 'flex';
                document.getElementById('addCashFormContent').style.display = 'block';
                document.getElementById('addCashSuccessContent').style.display = 'none';
                document.getElementById('addCashAmount').value = '';
            }
        });
    });

    const withdrawCashBtns = document.querySelectorAll('#withdrawCashBtn');
    withdrawCashBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (withdrawCashModal) {
                withdrawCashModal.style.display = 'flex';
                document.getElementById('withdrawCashFormContent').style.display = 'block';
                document.getElementById('withdrawSuccessContent').style.display = 'none';
                document.getElementById('withdrawAmount').value = '';
                document.getElementById('upiId').value = '';
                const balanceDisplay = document.getElementById('availableWithdrawBalance');
                if (balanceDisplay) balanceDisplay.innerText = currentBalance.toFixed(2);
            }
        });
    });

    // Close Modals
    const closeAddCash = document.getElementById('closeAddCash');
    if (closeAddCash && addCashModal) {
        closeAddCash.addEventListener('click', () => {
            addCashModal.style.display = 'none';
        });
    }

    const closeWithdrawCash = document.getElementById('closeWithdrawCash');
    if (closeWithdrawCash && withdrawCashModal) {
        closeWithdrawCash.addEventListener('click', () => {
            withdrawCashModal.style.display = 'none';
        });
    }

    // Coins Info Modal Controls
    const coinsNavBtn = document.querySelector('.loyalty-coins-nav');
    const coinsInfoModal = document.getElementById('coinsInfoModal');
    const closeCoinsInfo = document.getElementById('closeCoinsInfo');

    if (coinsNavBtn && coinsInfoModal) {
        coinsNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            coinsInfoModal.style.display = 'flex';
        });
    }

    if (closeCoinsInfo && coinsInfoModal) {
        closeCoinsInfo.addEventListener('click', () => {
            coinsInfoModal.style.display = 'none';
        });
    }

    // Redeem Coins Logic
    const btnConfirmRedeem = document.getElementById('btnConfirmRedeem');
    const redeemCoinsAmount = document.getElementById('redeemCoinsAmount');
    const modalCoinsAvailable = document.getElementById('modalCoinsAvailable');
    const coinsFormContent = document.getElementById('coinsFormContent');
    const redeemSuccessContent = document.getElementById('redeemSuccessContent');
    const redeemedCashVal = document.getElementById('redeemedCashVal');

    const updateModalCoinsBalance = () => {
        let userCoins = parseInt(localStorage.getItem('userCoins')) || 0;
        if (modalCoinsAvailable) {
            modalCoinsAvailable.innerText = `${userCoins} Coins`;
        }
    };

    if (coinsNavBtn) {
        coinsNavBtn.addEventListener('click', () => {
            updateModalCoinsBalance();
            if (coinsFormContent) coinsFormContent.style.display = 'block';
            if (redeemSuccessContent) redeemSuccessContent.style.display = 'none';
            if (redeemCoinsAmount) redeemCoinsAmount.value = '';
        });
    }

    if (btnConfirmRedeem) {
        btnConfirmRedeem.addEventListener('click', () => {
            const coinsToRedeem = parseInt(redeemCoinsAmount.value);
            let userCoins = parseInt(localStorage.getItem('userCoins')) || 0;

            if (isNaN(coinsToRedeem) || coinsToRedeem < 10) {
                alert('Please enter a valid amount. Minimum conversion is 10 Coins.');
                return;
            }

            if (coinsToRedeem % 10 !== 0) {
                alert('Redemption must be in multiples of 10 Coins (e.g. 10, 20, 30...).');
                return;
            }

            if (coinsToRedeem > userCoins) {
                alert('Insufficient Coins in your balance!');
                return;
            }

            // Calculate converted cash (10 Coins = 1 Rupee)
            const convertedCash = coinsToRedeem / 10;

            // Update local values
            userCoins -= coinsToRedeem;
            localStorage.setItem('userCoins', userCoins.toString());
            
            currentBalance += convertedCash;
            updateWalletUI(); // updates cash displays & header coins count

            // Show success screen
            if (redeemedCashVal) redeemedCashVal.innerText = convertedCash.toFixed(2);
            if (coinsFormContent) coinsFormContent.style.display = 'none';
            if (redeemSuccessContent) redeemSuccessContent.style.display = 'block';

            // Auto close modal after 3 seconds
            setTimeout(() => {
                if (coinsInfoModal) coinsInfoModal.style.display = 'none';
            }, 3000);
        });
    }

    // Submit Add Cash with Dynamic UPI QR Code & UTR Verification
    const submitAddCash = document.getElementById('submitAddCash');
    const addCashFormContent = document.getElementById('addCashFormContent');
    const addCashQRContent = document.getElementById('addCashQRContent');
    const qrAmountVal = document.getElementById('qrAmountVal');
    const upiQRCanvas = document.getElementById('upiQRCanvas');
    const mobileUpiBtnContainer = document.getElementById('mobileUpiBtnContainer');
    const mobileUpiPayLink = document.getElementById('mobileUpiPayLink');
    const upiRefInput = document.getElementById('upiRefInput');
    const btnCancelQR = document.getElementById('btnCancelQR');
    const btnSubmitUTR = document.getElementById('btnSubmitUTR');
    const addCashSuccessContent = document.getElementById('addCashSuccessContent');

    let currentDepositAmount = 0;

    // Detect if user is on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (submitAddCash) {
        submitAddCash.addEventListener('click', () => {
            const amountInput = document.getElementById('addCashAmount');
            const amount = parseFloat(amountInput.value);

            // Require Gmail login first
            const loggedInEmail = localStorage.getItem('userEmail');
            if (!loggedInEmail) {
                alert('Please Sign in with Gmail first to add cash to your wallet.');
                return;
            }

            if (isNaN(amount) || amount < 5) {
                alert('Minimum deposit amount is ₹5.');
                return;
            }

            currentDepositAmount = amount;

            // Generate UPI payment link
            const upiLink = `upi://pay?pa=7857005-2.wallet@phonepe&pn=VYRA%20Games&am=${amount.toFixed(2)}&cu=INR&tn=Wallet%20Deposit`;

            // Render QR Code using QRious library
            try {
                if (typeof QRious !== 'undefined') {
                    new QRious({
                        element: upiQRCanvas,
                        value: upiLink,
                        size: 200,
                        background: '#12131a',
                        foreground: '#00ff66'
                    });
                } else {
                    console.error('QRious library not loaded.');
                }
            } catch (err) {
                console.error('Error generating QR code:', err);
            }

            // Set amount display
            if (qrAmountVal) qrAmountVal.innerText = amount.toFixed(2);

            // Handle mobile app payment link
            if (isMobile && mobileUpiBtnContainer && mobileUpiPayLink) {
                mobileUpiBtnContainer.style.display = 'block';
                mobileUpiPayLink.href = upiLink;
            } else if (mobileUpiBtnContainer) {
                mobileUpiBtnContainer.style.display = 'none';
            }

            // Reset reference input
            if (upiRefInput) upiRefInput.value = '';

            // Transition UI
            if (addCashFormContent) addCashFormContent.style.display = 'none';
            if (addCashQRContent) addCashQRContent.style.display = 'block';
        });
    }

    // Cancel QR Code Screen
    if (btnCancelQR) {
        btnCancelQR.addEventListener('click', () => {
            if (addCashQRContent) addCashQRContent.style.display = 'none';
            if (addCashFormContent) addCashFormContent.style.display = 'block';
        });
    }

    // Submit UTR Number
    if (btnSubmitUTR) {
        btnSubmitUTR.addEventListener('click', async () => {
            const utr = upiRefInput.value.trim();
            const loggedInEmail = localStorage.getItem('userEmail');

            if (!utr || utr.length !== 12 || isNaN(utr)) {
                alert('Please enter a valid 12-digit UPI Transaction Ref / UTR Number.');
                return;
            }

            btnSubmitUTR.disabled = true;
            btnSubmitUTR.innerText = 'Verifying UTR...';

            try {
                const response = await fetch(`${API_BASE}/api/record-transaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: loggedInEmail,
                        amount: currentDepositAmount,
                        utr: utr
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Update Balance locally on success
                    currentBalance += currentDepositAmount;
                    updateWalletUI();

                    document.getElementById('addedAmountVal').innerText = currentDepositAmount.toFixed(2);
                    if (addCashQRContent) addCashQRContent.style.display = 'none';
                    if (addCashSuccessContent) addCashSuccessContent.style.display = 'block';

                    // Auto hide modal after 4 seconds
                    setTimeout(() => {
                        if (addCashModal) addCashModal.style.display = 'none';
                    }, 4000);
                } else {
                    alert(data.message || 'Verification failed. Please check UTR and retry.');
                    btnSubmitUTR.disabled = false;
                    btnSubmitUTR.innerText = 'Submit & Verify';
                }
            } catch (err) {
                console.error(err);
                alert('Could not connect to payment server. Using fallback wallet credit.');
                // Fallback locally
                currentBalance += currentDepositAmount;
                updateWalletUI();
                document.getElementById('addedAmountVal').innerText = currentDepositAmount.toFixed(2);
                if (addCashQRContent) addCashQRContent.style.display = 'none';
                if (addCashSuccessContent) addCashSuccessContent.style.display = 'block';
            }
        });
    }

    // Submit Withdraw Cash
    const submitWithdraw = document.getElementById('submitWithdraw');
    if (submitWithdraw) {
        submitWithdraw.addEventListener('click', async () => {
            const amountInput = document.getElementById('withdrawAmount');
            const amount = parseFloat(amountInput.value);
            const account = document.getElementById('withdrawAccount').value.trim();
            const ifsc = document.getElementById('withdrawIfsc').value.trim().toUpperCase();
            const loggedInEmail = localStorage.getItem('userEmail');

            if (!loggedInEmail) {
                alert('Please Sign in with Gmail first to withdraw cash.');
                return;
            }

            if (isNaN(amount) || amount < 300) {
                alert('Minimum withdrawal amount is ₹300.');
                return;
            }

            if (amount > currentBalance) {
                alert('Insufficient wallet balance.');
                return;
            }

            if (!account || account.length < 9) {
                alert('Please enter a valid Bank Account Number.');
                return;
            }

            if (!ifsc || ifsc.length !== 11) {
                alert('Please enter a valid 11-character bank IFSC Code.');
                return;
            }

            submitWithdraw.disabled = true;
            submitWithdraw.innerText = 'Processing Request...';

            try {
                const response = await fetch(`${API_BASE}/api/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: loggedInEmail,
                        amount: amount,
                        account: account,
                        ifsc: ifsc
                    })
                });

                const data = await response.json();

                if (data.success) {
                    currentBalance -= amount;
                    updateWalletUI();

                    document.getElementById('withdrawnAmountVal').innerText = amount.toFixed(2);
                    document.getElementById('withdrawCashFormContent').style.display = 'none';
                    document.getElementById('withdrawSuccessContent').style.display = 'block';

                    // Auto hide modal after 4 seconds
                    setTimeout(() => {
                        if (withdrawCashModal) withdrawCashModal.style.display = 'none';
                    }, 4000);
                } else {
                    alert(data.message || 'Withdrawal failed. Please check inputs and try again.');
                }
            } catch (err) {
                console.error(err);
                alert('Connection to server failed. Using fallback offline withdrawal.');
                // Fallback locally
                currentBalance -= amount;
                updateWalletUI();
                document.getElementById('withdrawnAmountVal').innerText = amount.toFixed(2);
                document.getElementById('withdrawCashFormContent').style.display = 'none';
                document.getElementById('withdrawSuccessContent').style.display = 'block';
            } finally {
                submitWithdraw.disabled = false;
                submitWithdraw.innerText = 'Confirm Withdrawal';
            }
        });
    }

    // --- Weekly Mega Tournament Modal Logic ---
    const megaRegisterModal = document.getElementById('megaRegisterModal');
    const joinMegaBtn = document.getElementById('joinMegaBtn');
    const closeMegaRegister = document.getElementById('closeMegaRegister');
    const submitMegaRegister = document.getElementById('submitMegaRegister');

    if (joinMegaBtn && megaRegisterModal) {
        joinMegaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const loggedInEmail = localStorage.getItem('userEmail');
            if (!loggedInEmail) {
                alert('Sign in first! Please verify your Gmail account to register.');
                if (gmailAuthModal) {
                    gmailAuthModal.style.display = 'flex';
                }
                return;
            }
            megaRegisterModal.style.display = 'flex';
            document.getElementById('megaFormContent').style.display = 'block';
            document.getElementById('megaSuccessContent').style.display = 'none';
            document.getElementById('megaUID').value = '';
        });
    }

    if (closeMegaRegister && megaRegisterModal) {
        closeMegaRegister.addEventListener('click', () => {
            megaRegisterModal.style.display = 'none';
        });
    }

    if (submitMegaRegister && megaRegisterModal) {
        submitMegaRegister.addEventListener('click', () => {
            const uidInput = document.getElementById('megaUID');
            const uid = uidInput.value.trim();

            if (!uid) {
                alert('Please enter your character UID.');
                return;
            }

            if (uid.length < 8 || isNaN(uid)) {
                alert('Please enter a valid Free Fire Character UID (numeric, minimum 8 digits).');
                return;
            }

            // Deduct entry fee
            const entryFee = 50;
            if (currentBalance < entryFee) {
                alert('Insufficient wallet balance to join this tournament! Please add cash to your wallet.');
                return;
            }

            currentBalance -= entryFee;
            updateWalletUI();

            document.getElementById('megaFormContent').style.display = 'none';
            document.getElementById('megaSuccessContent').style.display = 'block';
        });
    }

    // --- Category Filter Logic ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const gameCards = document.querySelectorAll('.game-card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            gameCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- Countdown Timer for Weekly Mega Tournament (Sunday 12:00 PM IST) ---
    const timerElement = document.getElementById('eventTimer');
    if (timerElement) {
        const updateTimer = () => {
            const now = new Date();
            
            // Calculate time relative to Indian Standard Time (IST - UTC+5:30)
            const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
            const istNow = new Date(utcTime + (3600000 * 5.5));
            
            // Create target date for upcoming Sunday 12:00 PM in IST
            let target = new Date(istNow);
            target.setDate(istNow.getDate() + (7 - istNow.getDay()) % 7); // Set to next Sunday
            target.setHours(12, 0, 0, 0); // Set to 12:00 PM

            // If Sunday 12:00 PM IST has already passed today, set target to next Sunday
            if (istNow.getDay() === 0 && istNow.getHours() >= 12) {
                target.setDate(target.getDate() + 7);
            }

            // Time difference in milliseconds
            const diff = target.getTime() - istNow.getTime();

            if (diff <= 0) {
                timerElement.innerText = "Tournament Started!";
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const format = (num) => String(num).padStart(2, '0');

            timerElement.innerText = `Starts in: ${days}d : ${format(hours)}h : ${format(minutes)}m : ${format(seconds)}s`;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // --- Live Winner Notification Toast ---
    const toast = document.getElementById('winnerToast');
    const toastUser = toast ? toast.querySelector('.toast-user') : null;
    const toastAward = toast ? toast.querySelector('.toast-award') : null;

    const mockWinners = [
        { name: "Suresh_Pro", prize: "$10.00", game: "Bubble Shooter" },
        { name: "GamerBoy9", prize: "50 Coins", game: "Fruit Ninja Pro" },
        { name: "Karan_007", prize: "$50.00", game: "Moto Rush" },
        { name: "Sofia_Playz", prize: "$15.00", game: "Sudoku Rush" },
        { name: "Rahul_King", prize: "20 Coins", game: "Bubble Shooter" },
        { name: "WinnerMax", prize: "$5.00", game: "Fruit Ninja Pro" }
    ];

    const showWinnerNotification = () => {
        if (!toast || !toastUser || !toastAward) return;

        // Choose random mock winner
        const winner = mockWinners[Math.floor(Math.random() * mockWinners.length)];
        
        toastUser.innerText = winner.name;
        toastAward.innerText = `won ${winner.prize} in ${winner.game}`;
        
        toast.classList.add('show');

        // Hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    };

    // Show first toast after 3 seconds, then repeat every 10 seconds
    setTimeout(() => {
        showWinnerNotification();
        setInterval(showWinnerNotification, 10000);
    }, 3000);

    // --- Clone ticker items for seamless looping ---
    const liveTicker = document.getElementById('liveTicker');
    if (liveTicker) {
        const items = Array.from(liveTicker.children);
        // Duplicate items
        items.forEach(item => {
            const clone = item.cloneNode(true);
            liveTicker.appendChild(clone);
        });
    }

    // --- Real-time Gmail Sign In with OTP Verification & Logout ---
    const gmailSignInBtn = document.getElementById('gmailSignInBtn');
    const gmailAuthModal = document.getElementById('gmailAuthModal');
    const closeGmailAuth = document.getElementById('closeGmailAuth');
    const gmailInputStep = document.getElementById('gmailInputStep');
    const gmailOtpStep = document.getElementById('gmailOtpStep');
    const gmailAddressInput = document.getElementById('gmailAddressInput');
    const gmailOtpInput = document.getElementById('gmailOtpInput');
    const btnRequestOtp = document.getElementById('btnRequestOtp');
    const btnVerifyOtp = document.getElementById('btnVerifyOtp');

    const API_BASE = window.location.protocol === 'file:' 
        ? 'https://shy-tigers-pull.loca.lt' 
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '');

    let verificationEmail = '';

    const handleLoginSuccess = (email) => {
        if (!gmailSignInBtn) return;
        gmailSignInBtn.innerHTML = `<i class="fa-solid fa-circle-user" style="color: var(--neon-green);"></i> Connected`;
        gmailSignInBtn.classList.add('connected');
        gmailSignInBtn.style.background = 'rgba(0, 255, 102, 0.05)';
        gmailSignInBtn.style.borderColor = 'rgba(0, 255, 102, 0.2)';
        gmailSignInBtn.style.cursor = 'default';

        // Add Logout Button dynamically next to the connected button
        let logoutBtn = document.getElementById('gmailLogoutBtn');
        if (!logoutBtn) {
            logoutBtn = document.createElement('a');
            logoutBtn.id = 'gmailLogoutBtn';
            logoutBtn.href = '#logout';
            logoutBtn.className = 'btn btn-secondary';
            logoutBtn.style.marginLeft = '10px';
            logoutBtn.style.padding = '0.6rem 1rem';
            logoutBtn.style.fontSize = '0.9rem';
            logoutBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Logout`;
            
            // Append logout button
            gmailSignInBtn.parentNode.insertBefore(logoutBtn, gmailSignInBtn.nextSibling);

            // Add Logout logic
            logoutBtn.addEventListener('click', (logoutEvent) => {
                logoutEvent.preventDefault();
                localStorage.removeItem('userEmail');
                
                // Reset sign-in button state
                gmailSignInBtn.innerHTML = `<i class="fa-solid fa-envelope" style="color: #ea4335;"></i> Sign in with Gmail`;
                gmailSignInBtn.classList.remove('connected');
                gmailSignInBtn.style.background = '';
                gmailSignInBtn.style.borderColor = '';
                gmailSignInBtn.style.cursor = 'pointer';

                // Remove logout button itself
                logoutBtn.remove();
                alert("Successfully logged out.");
            });
        }
    };

    // Check for existing session
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail && gmailSignInBtn) {
        handleLoginSuccess(savedEmail);
    } else {
        // Enforce login on load if not authenticated
        if (gmailAuthModal) {
            gmailAuthModal.style.display = 'flex';
            // Hide the close button to force sign in
            if (closeGmailAuth) closeGmailAuth.style.display = 'none';
        }
    }

    // Modal Control
    if (gmailSignInBtn) {
        gmailSignInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (gmailSignInBtn.classList.contains('connected')) return;
            
            if (gmailAuthModal) {
                gmailAuthModal.style.display = 'flex';
                // Reset to step 1
                gmailInputStep.style.display = 'block';
                gmailOtpStep.style.display = 'none';
                gmailAddressInput.value = '';
                gmailOtpInput.value = '';
                btnRequestOtp.disabled = false;
                btnRequestOtp.innerText = 'Send Verification OTP';
            }
        });
    }

    if (closeGmailAuth && gmailAuthModal) {
        closeGmailAuth.addEventListener('click', () => {
            gmailAuthModal.style.display = 'none';
        });
    }

    // Request OTP Click
    if (btnRequestOtp) {
        btnRequestOtp.addEventListener('click', async () => {
            const ffuidVal = document.getElementById('gmailFFUIDInput') ? document.getElementById('gmailFFUIDInput').value.trim() : '';
            const instaidVal = document.getElementById('gmailInstaIDInput') ? document.getElementById('gmailInstaIDInput').value.trim() : '';

            const email = gmailAddressInput.value.trim();

            if (!email) {
                alert('Please enter a Gmail address.');
                return;
            }

            if (!email.toLowerCase().endsWith('@gmail.com')) {
                alert('Error: Only valid Gmail accounts (@gmail.com) are allowed to sign in.');
                return;
            }

            if (!ffuidVal || ffuidVal.length < 8 || isNaN(ffuidVal)) {
                alert('Please enter a valid Garena Free Fire numeric Character UID (minimum 8 digits).');
                return;
            }

            if (!instaidVal) {
                alert('Please enter your Instagram username ID.');
                return;
            }

            btnRequestOtp.disabled = true;
            btnRequestOtp.innerText = 'Sending OTP...';

            try {
                const response = await fetch(`${API_BASE}/api/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    verificationEmail = email;
                    gmailInputStep.style.display = 'none';
                    gmailOtpStep.style.display = 'block';
                    
                    // Alert mock code if running in mock mode
                    if (data.mock) {
                        alert(`[MOCK MODE ACTIVE]\nNo credentials configured in backend .env.\nMock OTP: ${data.otp}\nUse this OTP to complete sign-in.`);
                    } else {
                        alert('OTP has been successfully sent to your Gmail!');
                    }
                } else {
                    alert(data.message || 'Failed to send OTP.');
                    btnRequestOtp.disabled = false;
                    btnRequestOtp.innerText = 'Send Verification OTP';
                }
            } catch (err) {
                console.error(err);
                alert('Connection to verification server failed. Ensure the server is running on http://localhost:3000');
                btnRequestOtp.disabled = false;
                btnRequestOtp.innerText = 'Send Verification OTP';
            }
        });
    }

    // Verify OTP Click
    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener('click', async () => {
            const otp = gmailOtpInput.value.trim();

            if (!otp || otp.length !== 6 || isNaN(otp)) {
                alert('Please enter a valid 6-digit OTP code.');
                return;
            }

            const ffuid = document.getElementById('gmailFFUIDInput') ? document.getElementById('gmailFFUIDInput').value.trim() : '';
            const instaid = document.getElementById('gmailInstaIDInput') ? document.getElementById('gmailInstaIDInput').value.trim() : '';

            if (!ffuid || !instaid) {
                alert('Free Fire Character UID and Instagram ID are required to verify account.');
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerText = 'Verify & Sign In';
                return;
            }

            btnVerifyOtp.disabled = true;
            btnVerifyOtp.innerText = 'Verifying...';

            try {
                const response = await fetch(`${API_BASE}/api/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: verificationEmail, otp, ffuid, instaid })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('userEmail', verificationEmail);
                    handleLoginSuccess(verificationEmail);
                    gmailAuthModal.style.display = 'none';
                    alert('Successfully verified and signed in!');
                } else {
                    alert(data.message || 'Verification failed.');
                    btnVerifyOtp.disabled = false;
                    btnVerifyOtp.innerText = 'Verify & Sign In';
                }
            } catch (err) {
                console.error(err);
                alert('Connection error during verification. Please try again.');
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.innerText = 'Verify & Sign In';
            }
        });
    }
    // Fetch and display dynamic leaderboard
    const loadLeaderboard = async () => {
        const listContainer = document.querySelector('.leaderboard-list');
        if (!listContainer) return;

        try {
            const response = await fetch(`${API_BASE}/api/leaderboard`);
            if (response.ok) {
                const data = await response.json();
                const list = data.leaderboard || [];

                listContainer.innerHTML = list.map((player, index) => {
                    const rank = index + 1;
                    const isTopRank = rank === 1;
                    const avatar = isTopRank ? '👑' : (rank === 2 ? '👾' : (rank === 3 ? '🦊' : '🎮'));
                    const status = isTopRank ? 'Active now' : 'Online';
                    
                    return `
                        <div class="leaderboard-item ${isTopRank ? 'rank-1' : ''}">
                            <div class="leaderboard-rank">${rank}</div>
                            <div class="leaderboard-player">
                                <span class="leaderboard-avatar">${avatar}</span>
                                <div>
                                    <span class="player-name">${player.email}</span>
                                    <span class="player-status">${status}</span>
                                </div>
                            </div>
                            <div class="leaderboard-score">${player.points.toLocaleString()} Pts</div>
                            <div class="leaderboard-prize">+₹200</div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            console.error("Error loading leaderboard:", e);
        }
    };

    // Load leaderboard immediately
    loadLeaderboard();
});


