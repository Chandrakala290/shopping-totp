import sdk from './web-sdk.js';
let deviceInfo = null;
let tranId = null;
let authType = null;
let selectedItem = '';
let selectedPrice = 0;
let totalAmount = 0;
let selectedStoreName = null;
let mfaInfo = null;
let customerId = null;
let cardNumber = null;
// let captchaId = 0;
window.addEventListener('DOMContentLoaded', () => {
  // console.log("Check", "1");
  const token = new URLSearchParams(window.location.search).get("token");
  if (token) {
    localStorage.setItem("tokenId", token);
    console.log("Token stored:", token);
  } else {
    console.warn("No token found in iframe URL");
  }
  // window.addEventListener("message", (event) => {
  //   console.log("Check", event.data);

  //   // Security check — only accept from your parent's origin
  //   if (event.origin !== "https://frm-demo.appsteer.io/") return;

  //   console.log("Check", "3");

  //   if (event.data.action === "setData") {
  //     // Do something with event.data.text
  //     alert(event.data.text);
  //   }
  // });

  window.getBrowserName = function () {
    const userAgent = navigator.userAgent;

    if (userAgent.includes("Edg/")) return "Edge";
    if (userAgent.includes("OPR/") || userAgent.includes("Opera")) return "Opera";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) return "Internet Explorer";

    return "Unknown";
  }

  window.selectStore = function (storeName) {
    selectedStoreName = storeName;
    document.getElementById('storeSelectionPage').classList.add('hidden')
    document.getElementById('shopSection').classList.remove('hidden');
    document.getElementById('paymentSection').classList.add('hidden');
    document.getElementById('device-info').classList.add('hidden');
    document.getElementById('otpSection').classList.add('hidden');
    document.getElementById('success-section').classList.add('hidden');
    document.getElementById('oob-container').classList.add('hidden');
    document.getElementById('oob-failed').classList.add('hidden');
    document.getElementById('riskscore-info').classList.add('hidden');
    document.getElementById('failed-section').classList.add('hidden');
    document.getElementById('captcha-section').classList.add('hidden');
    document.getElementById('challenge-section').classList.add('hidden');

  }
  window.getOSName = function () {
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent;

    if (platform.includes("win")) return "Windows";
    if (platform.includes("mac")) return "macOS";
    if (platform.includes("linux")) return "Linux";
    if (/android/i.test(userAgent)) return "Android";
    if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";

    return "Unknown";
  }

  window.goToPayment = function (item, price) {
    showLoader();
    document.getElementById('storeSelectionPage').classList.add('hidden')
    document.getElementById('shopSection').classList.add('hidden');
    document.getElementById('paymentSection').classList.remove('hidden');
    document.getElementById('device-info').classList.remove('hidden');
    document.getElementById('riskscore-info').classList.remove('hidden');
    document.getElementById('otpSection').classList.add('hidden');
    document.getElementById('success-section').classList.add('hidden');
    document.getElementById('oob-container').classList.add('hidden');

    document.getElementById('failed-section').classList.add('hidden')


    document.getElementById('oob-failed').classList.add('hidden');
    document.getElementById('captcha-section').classList.add('hidden');
    document.getElementById('challenge-section').classList.add('hidden');
    setTimeout(() => {
      hideLoader()
    }, 500)


    selectedItem = item;
    selectedPrice = price;
    totalAmount = parseFloat((price * 1.1).toFixed(2));
    const tax = (price * 0.1).toFixed(2);

    document.getElementById('itemName').textContent = item;
    document.getElementById('itemPrice').textContent = '$' + price.toFixed(2);
    document.getElementById('taxAmount').textContent = '$' + tax;
    document.getElementById('totalAmount').textContent = '$' + totalAmount;
    const sessionId = crypto.randomUUID();

    // Retry until SDK is available
    const tryInitialize = () => {
      if (sdk && typeof sdk.initialize === 'function') {
        sdk.initialize({
          env: 'PROD',
          sessionId: sessionId,
          apiKey: 'acurazi-demo',
          apiSecret: 'secret-2c8456e3-d377-4502-803e-c64c157d27ba',
        })
          .then(result => result.get())
          .then(data => {
            deviceInfo = data;
            const ipData = deviceInfo.ipIntelligence || {};
            const browserData = deviceInfo.browserDetections || {};

            const isVPN = ipData.isVPN;
            const isTor = ipData.isTor;
            const isIncognito = browserData.isIncognito;

            // ✅ Check if any of these values are missing (undefined or null)
            const missingCriticalValues = [isVPN, isTor, isIncognito].some(v => v === undefined || v === null);
            const rawRiskScore = missingCriticalValues ? 'high' : deviceInfo.riskScore;
            setRiskScore(rawRiskScore)
            deviceInfo.riskScore = mapRiskScore(data.riskScore);
            // setRiskScore(data.riskScore);
            if (deviceInfo.ipIntelligence) {
              const city = deviceInfo.ipIntelligence.city || 'Unknown City';
              const region = deviceInfo.ipIntelligence.region || 'Unknown Region';
              const country = deviceInfo.ipIntelligence.country || 'Unknown Country';

              document.getElementById('geoLocation').textContent = `${city}, ${region}, ${country}`;

              // Optional detections
              updateTag("vpnStatus", deviceInfo.ipIntelligence.isVPN, "Detected", "Not Detected");
              updateTag("proxyStatus", deviceInfo.ipIntelligence.isProxy, "Detected", "Not Detected");
              updateTag("torStatus", deviceInfo.ipIntelligence.isTor, "Detected", "Not Detected", true);
            }

            if (deviceInfo.browserDetections) {
              updateTag("botStatus", deviceInfo.browserDetections.isBotDetected, "Detected", "Not Detected");
              updateTag("adBlockerStatus", deviceInfo.browserDetections.isAdBlockerEnabled, "Detected", "Not Detected");
              updateTag("devToolsStatus", deviceInfo.browserDetections.isDevToolsOpen, "Detected", "Not Detected");
              updateTag("incognitoStatus", deviceInfo.browserDetections.isIncognito, "Detected", "Not Detected", true);
            }
          })
          .catch(err => {
            hideLoader();
            console.error("SDK Error:", err);
            // alert("SDK failed: " + err.message);
          });
      } else {
        console.warn("SDK not ready, retrying...");
        setTimeout(tryInitialize, 200); // retry after 200ms
      }
    };
    setTimeout(() => {
      tryInitialize();
      hideLoader();
    }, 500);


  }
  window.setRiskScore = function (scoreLabel) {
    const el = document.getElementById('riskscore');

    let className = '';
    switch (scoreLabel.toLowerCase()) {
      case 'low':
        className = 'tag success';
        break;
      case 'medium':
        className = 'tag warning';
        break;
      case 'high':
        className = 'tag danger';
        break;
      default:
        className = 'tag';
    }

    el.className = className;
    el.textContent = scoreLabel.charAt(0).toUpperCase() + scoreLabel.slice(1);
  };

  window.updateTag = function (id, condition, detectedText, notDetectedText, danger = false) {
    const el = document.getElementById(id);
    el.textContent = condition ? detectedText : notDetectedText;
    el.className = `tag ${condition ? (danger ? 'danger' : 'warning') : 'success'}`;
  }
  //  window.setRiskScore = function (score){
  //    const el = document.getElementById('riskscore');
  //   if (!el) return;

  //   const value = score.toLowerCase();
  //   let className = '';

  //   switch (value) {
  //     case 'low':
  //       className = 'success';
  //       break;
  //     case 'medium':
  //       className = 'warning';
  //       break;
  //     case 'high':
  //       className = 'danger';
  //       break;
  //     default:
  //       className = '';
  //   }

  //   el.textContent = value.charAt(0).toUpperCase() + value.slice(1);
  //   el.className = `tag ${className}`;
  //  }

  window.showLoader = function () {
    document.getElementById('loader').classList.remove('hidden');
  };

  window.hideLoader = function () {
    document.getElementById('loader').classList.add('hidden');
  };
  window.continueShopping = function () {
    document.getElementById('storeSelectionPage').classList.remove('hidden');
    document.getElementById('shopSection').classList.add('hidden');
    document.getElementById('paymentSection').classList.add('hidden');
    document.getElementById('device-info').classList.add('hidden');
    document.getElementById('otpSection').classList.add('hidden');
    document.getElementById('success-section').classList.add('hidden');
    document.getElementById('oob-container').classList.add('hidden');
    document.getElementById('oob-failed').classList.add('hidden');
    document.getElementById('failed-section').classList.add('hidden')
    document.getElementById('riskscore-info').classList.add('hidden');
    document.getElementById('captcha-section').classList.add('hidden');


    resetPaymentForm();


    // Optionally reset cart variables
    selectedItem = '';
    selectedPrice = 0;
    totalAmount = 0;
    selectedStoreName = null;

    // Reset display
    const paidAmountEl = document.getElementById('paidAmount');
    if (paidAmountEl) paidAmountEl.textContent = '$0.00';
  };

  window.resetPaymentForm = function () {
    const inputs = ['cardNumber', 'expiryDate', 'cvv', 'cardName', 'otpInput', 'captchaInput', 'answerInput'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  };


  window.mapRiskScore = function (score) {
    if (typeof score === 'string') {
      switch (score.toLowerCase()) {
        case 'low': return 30;
        case 'medium': return 65;
        case 'high': return 90;
        default: return 0;
      }
    }
    return score; // If already a number (0–100)
  }
  window.goBacktoStore = function () {
    document.getElementById('storeSelectionPage').classList.remove('hidden')
    document.getElementById('shopSection').classList.add('hidden');
    document.getElementById('paymentSection').classList.add('hidden');
    document.getElementById('device-info').classList.add('hidden');
    document.getElementById('otpSection').classList.add('hidden');
    document.getElementById('success-section').classList.add('hidden');
    document.getElementById('oob-container').classList.add('hidden');
    document.getElementById('oob-failed').classList.add('hidden');
    document.getElementById('riskscore-info').classList.add('hidden');
    document.getElementById('failed-section').classList.add('hidden');
    document.getElementById('captcha-section').classList.add('hidden');
    document.getElementById('challenge-section').classList.add('hidden');


  }
  window.goBack = function () {
    document.getElementById('storeSelectionPage').classList.add('hidden')
    document.getElementById('shopSection').classList.remove('hidden');
    document.getElementById('paymentSection').classList.add('hidden');
    document.getElementById('device-info').classList.add('hidden');
    document.getElementById('otpSection').classList.add('hidden');
    document.getElementById('success-section').classList.add('hidden');
    document.getElementById('oob-container').classList.add('hidden');
    document.getElementById('riskscore-info').classList.add('hidden');
    document.getElementById('captcha-section').classList.add('hidden');
    document.getElementById('oob-failed').classList.add('hidden');
    document.getElementById('failed-section').classList.add('hidden');
    document.getElementById('challenge-section').classList.add('hidden');

  }

  //     window.validateCard = function (){
  //       const cardNumber = document.getElementById('cardNumber').value.trim();
  //       const expiryDate = document.getElementById('expiryDate').value.trim();
  //       const cvv = document.getElementById('cvv').value.trim();
  //       const cardName = document.getElementById('cardName').value.trim();

  //       const isValid =
  //         cardNumber.length === 16 &&
  //         expiryDate.length === 5 &&
  //         cvv.length === 3 &&
  //         cardName.length > 0;

  //       document.getElementById('payBtn').disabled = !isValid;
  //     }
  //    window.addEventListener('DOMContentLoaded', () => {
  //   const inputs = ['cardNumber', 'expiryDate', 'cvv', 'cardName'];
  //   inputs.forEach(id => {
  //     document.getElementById(id).addEventListener('input', validateCardForm);
  //   });
  // });
  window.initiatePayment = function () {
    const totalAmountText = document.getElementById('totalAmount')?.textContent || "$0.00";
    const amountMatch = totalAmountText.match(/[\d.]+/);
    totalAmount = amountMatch ? parseFloat(amountMatch[0]) : 0;

     cardNumber = document.getElementById('cardNumber').value
    // const payload = {
    //   "channelId": "01",
    //   "customerId": cardNumber,
    //   "transactionInfo": {
    //     "type": "transaction",
    //     "date": "2025-07-23 15:40:00",
    //     "amount": totalAmount,
    //     "currencyCode": "840",
    //     "merchantName": selectedStoreName,
    //     "merchantUrl": ""
    //   },
    //   "deviceInfo": {
    //     "deviceId": deviceInfo.fingerprint,
    //     "browser": getBrowserName(),
    //     "operatingSystem": getOSName(),
    //     "requestId": deviceInfo.requestId,
    //     "ipAddress": deviceInfo.ipIntelligence?.ip,
    //     "sessionId": deviceInfo.sessionId,
    //     "userAgent": navigator.userAgent,
    //     "geoLocation": `${deviceInfo.ipIntelligence.city}, ${deviceInfo.ipIntelligence.region},${deviceInfo.ipIntelligence.country}`,
    //     "isVpn": deviceInfo.ipIntelligence.isVPN,
    //     "isProxy": deviceInfo.ipIntelligence.isProxy,
    //     "isTor": deviceInfo.ipIntelligence.isTor,
    //     "internetProvider": "Not Resolved",
    //     "botDetected": deviceInfo.browserDetections.isBotDetected,
    //     "riskScore": 30
    //   }

    // };
    const payload = {
      score: [deviceInfo.riskScore ]
    }
    console.log(payload);
    const apiUrl = "https://frm-demo.appsteer.io/services/rule/validate?formUUID=cb605830-bc7b-4b44-a1d8-baf6050fb4e2&recordId=3fbac30c-c347-4b99-8bd9-908501c7f4c8&currentStatusId=0"
    fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2' // Replace if needed
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(response => {
        hideLoader();
        // if (response?.data[0]?.message === 'baseLogin') {
        //   document.getElementById('storeSelectionPage').classList.add('hidden')
        //   document.getElementById('shopSection').classList.add('hidden');
        //   document.getElementById('paymentSection').classList.add('hidden');
        //   document.getElementById('device-info').classList.add('hidden');
        //   document.getElementById('failed-section').classList.add('hidden')
        //   document.getElementById('riskscore-info').classList.add('hidden');

        //   document.getElementById('otpSection').classList.add('hidden');
        //   document.getElementById('success-section').classList.remove('hidden');
        //   document.getElementById('oob-container').classList.add('hidden');
        //   document.getElementById('oob-failed').classList.add('hidden');
        //   document.getElementById('captcha-section').classList.add('hidden');

        //   document.getElementById('paidAmount').textContent = '$' + totalAmount;
        // }
        if (response?.data[0]?.message === 'otpLogin') {
          // const token = localStorage.getItem('tokenId');
          // const apiUrl = " https://frm-demo.appsteer.io/services/mfa/otp/generate?connectionUUID=1add4ff8-45b1-47c2-bfe6-456571222e73"
          // fetch(apiUrl, {
          //   method: 'GET',
          //   headers: {
          //     'Content-Type': 'application/json',
          //     'Authorization': `Bearer ${token}`
          //   }
          // }).then(res => res.json())
          //   .then(data => {
          //     mfaInfo = data.mfaInfo;
          //     //           let resendBtn = document.getElementById("resendBtn");
          //     // let countdownText = document.getElementById("countdownText");

          //   })
          document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');

          document.getElementById('otpSection').classList.remove('hidden');
          document.getElementById('success-section').classList.add('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('oob-failed').classList.add('hidden');
          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
        }

        else if (response?.data[0]?.message === 'captcha') {
          const apiUrl = "https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/5a4d717e-91e7-4767-a835-dc36e194138b"
          const payload = {
            "beneficiaryName": "Hrusikesh",
            "channel": "IB",
            "customerAccount": "76483562935",
            "customerID": cardNumber,
            "customerMobile": "9876564240",
            "deviceIP": "10.10.10.10",
            "mfaMethod": "CPT",
            "requestID": "1234_7890",
            "txnAmount": 1000.00,
            "txnCurrency": "INR",
            "txnDate": "2021-09-28",
            "txnReference": "7890653",
            "captchaType": "ALPHA_NUMERIC"
          }
          fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
            },
            body: JSON.stringify(payload)
          }).then(data => data.json())
            .then(res => {
              customerId = res.customerID;
              const captchaBase64 = res?.challenge[0]?.Captcha;
              document.getElementById('captchaImg').src = `data:image/jpeg;base64,${captchaBase64}`;
              if (res.responeCode === '200') {
                document.getElementById('storeSelectionPage').classList.add('hidden')
                document.getElementById('shopSection').classList.add('hidden');
                document.getElementById('paymentSection').classList.add('hidden');
                document.getElementById('failed-section').classList.add('hidden')
                document.getElementById('device-info').classList.add('hidden');
                document.getElementById('riskscore-info').classList.add('hidden');

                document.getElementById('otpSection').classList.add('hidden');
                document.getElementById('success-section').classList.add('hidden');
                document.getElementById('oob-container').classList.add('hidden');
                document.getElementById('oob-failed').classList.add('hidden');
                document.getElementById('captcha-section').classList.remove('hidden');
                document.getElementById('challenge-section').classList.add('hidden');
              }
              else {
                document.getElementById('storeSelectionPage').classList.add('hidden')
                document.getElementById('shopSection').classList.add('hidden');
                document.getElementById('paymentSection').classList.add('hidden');
                document.getElementById('failed-section').classList.add('hidden')
                document.getElementById('device-info').classList.add('hidden');
                document.getElementById('riskscore-info').classList.add('hidden');

                document.getElementById('otpSection').classList.add('hidden');
                document.getElementById('success-section').classList.add('hidden');
                document.getElementById('oob-container').classList.add('hidden');
                document.getElementById('oob-failed').classList.remove('hidden');
                document.getElementById('captcha-section').classList.add('hidden');
                document.getElementById('challenge-section').classList.add('hidden');
              }
            })




        }
        else if (response?.data[0]?.message === 'SQA') {
          const apiUrl = "https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/864221b3-ea8a-4ce3-b0a4-750c7a08e0bc"
          const payload = {
            "beneficiaryName": "Hrusikesh",
            "channel": "IB",
            "customerAccount": "6542329810",
            "customerID": cardNumber,
            "customerMobile": "9876564240",
            "deviceIP": "10.10.10.10",
            "mfaMethod": "CHQ",
            "requestID": "145830",
            "txnAmount": 1000.00,
            "txnCurrency": "INR",
            "txnDate": "2021-09-28",
            "txnReference": "7890653"
          }
          fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
            },
            body: JSON.stringify(payload)
          }).then(data => data.json())
            .then(res => {
              customerId = res.customerID;
              if (res.responseCode === '200') {
                document.getElementById("securityQuestion").textContent = res.challenge[0].value;
                document.getElementById('storeSelectionPage').classList.add('hidden')
                document.getElementById('shopSection').classList.add('hidden');
                document.getElementById('paymentSection').classList.add('hidden');
                document.getElementById('failed-section').classList.add('hidden')
                document.getElementById('device-info').classList.add('hidden');
                document.getElementById('riskscore-info').classList.add('hidden');

                document.getElementById('otpSection').classList.add('hidden');
                document.getElementById('success-section').classList.add('hidden');
                document.getElementById('oob-container').classList.add('hidden');
                document.getElementById('oob-failed').classList.add('hidden');
                document.getElementById('captcha-section').classList.add('hidden');
                document.getElementById('challenge-section').classList.remove('hidden');
              }
              else {
                document.getElementById('storeSelectionPage').classList.add('hidden')
                document.getElementById('shopSection').classList.add('hidden');
                document.getElementById('paymentSection').classList.add('hidden');
                document.getElementById('failed-section').classList.add('hidden')
                document.getElementById('device-info').classList.add('hidden');
                document.getElementById('riskscore-info').classList.add('hidden');

                document.getElementById('otpSection').classList.add('hidden');
                document.getElementById('success-section').classList.add('hidden');
                document.getElementById('oob-container').classList.add('hidden');
                document.getElementById('oob-failed').classList.remove('hidden');
                document.getElementById('captcha-section').classList.add('hidden');
                document.getElementById('challenge-section').classList.add('hidden');
              }

            })
        }
        // tranId = response.tranId;
        // authType = response.authType;
        // if (response.status === 'RN') {
        //   console.log('declinde');
        //             document.getElementById('storeSelectionPage').classList.add('hidden')
        //   document.getElementById('shopSection').classList.add('hidden');
        //   document.getElementById('paymentSection').classList.add('hidden');
        //       document.getElementById('device-info').classList.add('hidden');
        //                     document.getElementById('riskscore-info').classList.add('hidden');

        //   document.getElementById('otpSection').classList.add('hidden');
        //   document.getElementById('success-section').classList.add('hidden');
        //   document.getElementById('oob-container').classList.add('hidden');
        //             document.getElementById('oob-failed').classList.add('hidden');
        //             document.getElementById('failed-section').classList.remove('hidden')

        //         const rnMsg = document.getElementById('rn-message');
        // rnMsg.textContent = 'Declined transaction done by ruleEngine';
        // rnMsg.style.display = 'block';

        // showToast('Declined transaction done by ruleEngine', 'error')
        // }
        // else if (response.status === 'RY') {
        //    showToast('Payment initiated successfully!', 'success');
        //   document.getElementById('storeSelectionPage').classList.add('hidden')
        //   document.getElementById('shopSection').classList.add('hidden');
        //   document.getElementById('paymentSection').classList.add('hidden');
        //       document.getElementById('device-info').classList.add('hidden');
        //        document.getElementById('failed-section').classList.add('hidden')
        //                     document.getElementById('riskscore-info').classList.add('hidden');

        //   document.getElementById('otpSection').classList.add('hidden');
        //   document.getElementById('success-section').classList.remove('hidden');
        //   document.getElementById('oob-container').classList.add('hidden');
        //             document.getElementById('oob-failed').classList.add('hidden');

        //   document.getElementById('paidAmount').textContent = '$' + totalAmount;
        //   showToast('Authentication successful!', 'success');
        // }
        // else if (response.status === 'AR' && response.authType === 'OTP') {
        //    showToast('Payment initiated successfully!', 'success');
        //   document.getElementById('storeSelectionPage').classList.add('hidden')
        //   document.getElementById('shopSection').classList.add('hidden');
        //   document.getElementById('paymentSection').classList.add('hidden');
        //    document.getElementById('failed-section').classList.add('hidden')
        //       document.getElementById('device-info').classList.add('hidden');
        //                     document.getElementById('riskscore-info').classList.add('hidden');

        //   document.getElementById('otpSection').classList.remove('hidden');
        //   document.getElementById('success-section').classList.add('hidden');
        //   document.getElementById('oob-container').classList.add('hidden');
        //             document.getElementById('oob-failed').classList.add('hidden');

        //   showToast('OTP sent successfully!', 'info');
        // }
        // else if (response.status === 'AR' && response.authType === 'OOB') {
        //   showToast('Payment initiated successfully!', 'success');
        //   document.getElementById('storeSelectionPage').classList.add('hidden')
        //   document.getElementById('shopSection').classList.add('hidden');
        //   document.getElementById('failed-section').classList.add('hidden')
        //   document.getElementById('paymentSection').classList.add('hidden');
        //   document.getElementById('device-info').classList.add('hidden');
        //   document.getElementById('riskscore-info').classList.add('hidden');

        //   document.getElementById('otpSection').classList.add('hidden');
        //   document.getElementById('success-section').classList.add('hidden');
        //   document.getElementById('oob-container').classList.remove('hidden');
        //   document.getElementById('oob-failed').classList.add('hidden');
        //   let oobAttempts = 0;
        //   let oobInterval = setInterval(() => {
        //     oobAttempts++;

        //     validateOob().then((success) => {
        //       if (success) {
        //         clearInterval(oobInterval); // Stop retrying on success
        //       } else if (oobAttempts >= 3) {
        //         clearInterval(oobInterval); // Stop after 3 attempts
        //         // showToast('Authentication failed after 3 attempts.', 'error');
        //         document.getElementById('oob-failed').classList.remove('hidden');
        //         document.getElementById('storeSelectionPage').classList.add('hidden')
        //         document.getElementById('shopSection').classList.add('hidden');
        //         document.getElementById('device-info').classList.add('hidden');
        //         document.getElementById('riskscore-info').classList.add('hidden');
        //         document.getElementById('failed-section').classList.add('hidden')
        //         document.getElementById('paymentSection').classList.add('hidden');
        //         document.getElementById('otpSection').classList.add('hidden');
        //         document.getElementById('success-section').classList.add('hidden');
        //         document.getElementById('oob-container').classList.add('hidden');

        //       }
        //     });

        //   }, 5000);

        // }
      }).catch(err => {
        hideLoader();
        console.error("API ERRPR", err)
      })

    // Start trying
  }



  window.validateCaptcha = function () {
    showLoader();
    const apiurl = "https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/c2cb3af9-67c0-4928-a4e3-18f59694ca01"
    const userCaptchaValue = document.getElementById('captchaInput').value.trim();
    const payload = {
      "beneficiaryName": "Hrusikesh",
      "channel": "IB",
      "customerAccount": "76483562935",
      "customerID": customerId,
      "customerMobile": "9876564240",
      "deviceIP": "10.10.10.10",
      "enteredResponse": userCaptchaValue,
      "mfaMethod": "CPT",
      "requestID": "1234_7890",
      "txnAmount": 1000.00,
      "txnCurrency": "INR",
      "txnDate": "2021-09-28",
      "txnReference": "7890653"
    }
    fetch(apiurl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
      },
      body: JSON.stringify(payload)
    }).then(data => data.json())
      .then(res => {
        hideLoader();
        if (res.responeCode === '200') {

          document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')

          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('oob-failed').classList.add('hidden');
          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.remove('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
          document.getElementById('paidAmount').textContent = '$' + totalAmount;
          // showToast('Authentication successful!', 'success');
          resetPaymentForm();
        }
        else {
          document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');

          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.add('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('oob-failed').classList.remove('hidden');
          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
        }
      })
  }

  window.validateAnswer = function () {
    showLoader();
    const apiurl = "https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/e2fc9bea-b5c0-4780-aa58-d4f425b28b3b"
    const answer = document.getElementById('answerInput').value;
    const payload = {
      "beneficiaryName": " Hrusikesh",
      "channel": "IB",
      "customerAccount": "6542329810",
      "customerID": customerId,
      "customerMobile": "9876564240",
      "deviceIP": "10.10.10.10",
      "enteredResponse": [
        {
          "id": 0,
          "value": answer,
        }
      ],
      "mfaMethod": "CHQ",
      "requestID": "145830",
      "txnAmount": 1000.00,
      "txnCurrency": "INR",
      "txnDate": "2021-09-28",
      "txnReference": "7890653"
    }
    fetch(apiurl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
      },
      body: JSON.stringify(payload)
    }).then(data => data.json())
      .then(res => {
        hideLoader();
        if (res.responseCode === '200') {
          document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')

          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('oob-failed').classList.add('hidden');
          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.remove('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
          document.getElementById('paidAmount').textContent = '$' + totalAmount;
          // showToast('Authentication successful!', 'success');
          resetPaymentForm();
        }
        else {
          document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');

          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.add('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('oob-failed').classList.remove('hidden');
          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
        }
      })
  }
  //  window.startCountdown = function( seconds){
  //   let remaining =seconds;
  //   resendBtn.disabled = true;
  //   let timer = setInterval(() => {
  //     countdownText.textContent = `You can resend OTP in ${remaining}s`;
  //     remaining--;

  //     if (remaining < 0) {
  //       clearInterval(timer);
  //       countdownText.textContent = "You can now resend OTP";
  //       resendBtn.disabled = false; // enable button
  //     }
  //   }, 1000);
  //  }
  // window.validateOob = function () {
  //   return new Promise((resolve) => {
  //     const oobapi = 'https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/feab07db-c260-4aea-8f57-465fba6176ff';
  //     const oob = {
  //       "tranId": tranId,
  //       "authType": "OOB"
  //     };
  //     fetch(oobapi, {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
  //       },
  //       body: JSON.stringify(oob)
  //     }).then(data => data.json())
  //       .then(res => {
  //         if (res.message === 'Authentication success') {
  //           document.getElementById('storeSelectionPage').classList.add('hidden')
  //           document.getElementById('shopSection').classList.add('hidden');
  //           document.getElementById('paymentSection').classList.add('hidden');
  //           document.getElementById('device-info').classList.add('hidden');
  //           document.getElementById('failed-section').classList.add('hidden')
  //           document.getElementById('riskscore-info').classList.add('hidden');

  //           document.getElementById('otpSection').classList.add('hidden');
  //           document.getElementById('success-section').classList.remove('hidden');
  //           document.getElementById('oob-container').classList.add('hidden');
  //           document.getElementById('paidAmount').textContent = '$' + totalAmount;
  //           showToast('Authentication successful!', 'success');
  //           resetPaymentForm();
  //           resolve(true); // ✅ resolve success
  //         } else {
  //           document.getElementById('oob-failed').classList.remove('hidden');
  //           document.getElementById('storeSelectionPage').classList.add('hidden')
  //           document.getElementById('shopSection').classList.add('hidden');
  //           document.getElementById('device-info').classList.add('hidden');
  //           document.getElementById('riskscore-info').classList.add('hidden');
  //           document.getElementById('failed-section').classList.add('hidden')
  //           document.getElementById('paymentSection').classList.add('hidden');
  //           document.getElementById('otpSection').classList.add('hidden');
  //           document.getElementById('success-section').classList.add('hidden');
  //           document.getElementById('oob-container').classList.add('hidden');
  //           // showToast(res.message, 'error');
  //           resolve(false); // ❌ resolve failure
  //         }
  //       }).catch(() => {
  //         showToast("OOB validation failed.", 'error');
  //         resolve(false); // ❌ also resolve failure on error
  //       });
  //   });
  // };

  // window.resendOtp = function () {
  //   // const resendApi = 'https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/54fcf5d6-e19b-4df4-9ef4-5fd4e7f92ba7';
  //   const resendApi = mfaInfo.detail.refreshURL
  //   // const resend = {
  //   //   "tranId": tranId,
  //   //   "isOtpResend": true
  //   // }
  //   fetch(resendApi, {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       // 'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
  //     },
  //     // body: JSON.stringify(resend)
  //   }).then(data => data.json())
  //     .then(res => {
  //       mfaInfo = res.mfaInfo;
  //       // if (res.message === 'Resend success') {
  //       if (res.statusCode === 1) {
  //         showToast('Resend OTP successfully!', 'success');
  //       }
  //       else {
  //         showToast('Resend OTP failed!', 'error');
  //       }
  //     })
  // }
  window.submitOtp = function () {
    const token = document.getElementById('otpInput').value;
    // const validationURL = mfaInfo.detail.validationURL;
    // const keyName = mfaInfo.detail.keyName;
    const otpApiUrl = 'http://40.76.139.12:8440/mfa/totp/validate'
    const otpPayload = new URLSearchParams({
      username: cardNumber,
      otp: token
    });
    // const otpApiUrl = 'https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/a91de6d5-94ca-4241-829e-386085d776ed';
    // const otpPayload = {
    //   "tranId": tranId,
    //   "authType": authType,
    //   "authValue": token
    // };
    // const otpPayload ={
    //   validationURL :  mfaInfo.detail.validationURL,
    //   validationMethod : mfaInfo.detail.validationMethod,
    //   keyName: mfaInfo.detail.keyName,
    //   token : token,
    // }
    fetch(otpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': "application/x-www-form-urlencoded",
        'x-api-key' : "C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2"
        // 'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
      },
      body: otpPayload.toString()
    }).then(res => res.json())
      .then(response => {
        // if (response.message === 'Authentication success') {
        if (response.status === 'validation success') {
          // document.getElementById('paidAmount').textContent = '$' + totalAmount;
          document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')

          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('oob-failed').classList.add('hidden');
          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.remove('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
          document.getElementById('paidAmount').textContent = '$' + totalAmount;
          // showToast('Authentication successful!', 'success');
          resetPaymentForm();
        }
          else{
            document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');

          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.add('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('oob-failed').classList.remove('hidden');
          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden');
          resetPaymentForm();
          }
        // else if (response.status === 'SAR' && response.stepupAuthType === 'OOB') {
        //   const stepupOobPayload = {
        //     tranId: tranId,
        //     stepupAuthType: 'OOB'
        //   };

        //   fetch('https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/087145b7-f8d7-44eb-aff9-668fce83bec1', {
        //     method: 'PUT',
        //     headers: {
        //       'Content-Type': 'application/json',
        //       'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
        //     },
        //     body: JSON.stringify(stepupOobPayload)
        //   }).then(res => res.json())
        //     .then(triggerResponse => {
        //       console.log(triggerResponse)
        //       if (triggerResponse.authType === 'OOB') {
        //         document.getElementById('storeSelectionPage').classList.add('hidden')
        //         document.getElementById('shopSection').classList.add('hidden');
        //         document.getElementById('paymentSection').classList.add('hidden');
        //         document.getElementById('failed-section').classList.add('hidden')

        //         document.getElementById('device-info').classList.add('hidden');
        //         document.getElementById('riskscore-info').classList.add('hidden');

        //         document.getElementById('otpSection').classList.add('hidden');
        //         document.getElementById('success-section').classList.add('hidden');
        //         document.getElementById('oob-container').classList.remove('hidden');
        //         document.getElementById('oob-failed').classList.add('hidden');


        //         let oobAttempts = 0;
        //         let oobInterval = setInterval(() => {
        //           oobAttempts++;

        //           validateOob().then((success) => {
        //             if (success) {
        //               clearInterval(oobInterval); // Stop retrying on success
        //             } else if (oobAttempts >= 3) {
        //               clearInterval(oobInterval); // Stop after 3 attempts
        //               // showToast('Step-up OOB authentication failed.', 'error');
        //             }
        //           });

        //         }, 5000);
        //       } else {
        //         // showToast('Step-up OOB initiation failed.', 'error');
        //       }
        //     })
        //     .catch(err => {
        //       hideLoader();
        //       console.error('Step-up OOB Error:', err);
        //       // showToast('Step-up OOB request failed.', 'error');
        //     });

        // }
        // else {
        //   hideLoader()
        //   showToast(response.message, 'error');
        // }
      }).catch(err => {
       document.getElementById('storeSelectionPage').classList.add('hidden')
          document.getElementById('shopSection').classList.add('hidden');
          document.getElementById('paymentSection').classList.add('hidden');
          document.getElementById('failed-section').classList.add('hidden')
          document.getElementById('device-info').classList.add('hidden');
          document.getElementById('riskscore-info').classList.add('hidden');

          document.getElementById('otpSection').classList.add('hidden');
          document.getElementById('success-section').classList.add('hidden');
          document.getElementById('oob-container').classList.add('hidden');
          document.getElementById('oob-failed').classList.remove('hidden');
          document.getElementById('captcha-section').classList.add('hidden');
          document.getElementById('challenge-section').classList.add('hidden'); 
  console.error('Fetch error:', err);
});
  }
  // window.validateOobSar =function (){
  //   return new Promise((resolve) => {
  //   const oobapi = 'https://frm-demo.appsteer.io/services/mobile/external/triggerAPI/feab07db-c260-4aea-8f57-465fba6176ff';
  //   const oob = {
  //     "tranId": tranId,
  //     "authType": authType
  //   };
  //   fetch(oobapi, {
  //     method: 'PUT',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'X-AUTH-TOKEN': '77a68bb2-9c45-4860-89f8-4cefcb3d1cf2'
  //     },
  //     body: JSON.stringify(oob)
  //   }).then(data => data.json())
  //     .then(res => {
  //       if (res.message === 'Authentication success') {
  //         document.getElementById('storeSelectionPage').classList.add('hidden')
  //         document.getElementById('shopSection').classList.add('hidden');
  //         document.getElementById('paymentSection').classList.add('hidden');
  //         document.getElementById('otpSection').classList.add('hidden');
  //         document.getElementById('success-section').classList.remove('hidden');
  //         document.getElementById('oob-container').classList.add('hidden');
  //         document.getElementById('paidAmount').textContent = '$' + totalAmount;
  //         showToast('Authentication successful!', 'success');
  //         resolve(true); // ✅ resolve success
  //       } else {
  //         showToast(res.message, 'error');
  //         resolve(false); // ❌ resolve failure
  //       }
  //     }).catch(() => {
  //       showToast("OOB validation failed.", 'error');
  //       resolve(false); // ❌ also resolve failure on error
  //     });
  // });
  // }

  window.showToast = function (message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
    padding: 12px 20px;
    color: white;
    border-radius: 6px;
    min-width: 200px;
    max-width: 400px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: sans-serif;
    font-size: 14px;
    background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    animation: slidein 0.3s ease, fadeout 0.5s ease 2.5s;
    opacity: 1;
  `;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => container.removeChild(toast), 500);
    }, 3000);
  };



});


